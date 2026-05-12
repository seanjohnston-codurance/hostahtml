import * as cdk from "aws-cdk-lib";
import { Aws } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfrontOrigins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";
import * as path from "path";

export class HostahtmlStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const googleClientId =
      this.node.tryGetContext("googleClientId") ?? "REPLACE_WITH_GOOGLE_CLIENT_ID";

    // ── Uploads bucket ─────────────────────────────────────────────────────────
    const uploadsBucket = new s3.Bucket(this, "UploadsBucket", {
      bucketName: `hostahtml-uploads-${this.account}-${this.region}`,
      versioned: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        { id: "expire-after-7-days", expiration: cdk.Duration.days(7) },
      ],
    });

    // ── Frontend bucket + CloudFront ───────────────────────────────────────────
    const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      bucketName: `hostahtml-frontend-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const distribution = new cloudfront.Distribution(
      this,
      "FrontendDistribution",
      {
        defaultBehavior: {
          origin:
            cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(
              frontendBucket
            ),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
        defaultRootObject: "index.html",
        // Static SvelteKit: map 403/404 to /200.html (adapter-static fallback); not a generic SPA index swap
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/200.html",
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/200.html",
          },
        ],
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      }
    );

    // ── Lambda ─────────────────────────────────────────────────────────────────
    const apiFunction = new lambdaNode.NodejsFunction(this, "ApiFunction", {
      entry: path.join(__dirname, "../../api/src/handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      projectRoot: path.join(__dirname, "../.."),
      depsLockFilePath: path.join(__dirname, "../../package-lock.json"),
      environment: {
        BUCKET_NAME: uploadsBucket.bucketName,
        GOOGLE_CLIENT_ID: googleClientId,
      },
      bundling: {
        minify: true,
        sourceMap: false,
      },
    });

    uploadsBucket.grantReadWrite(apiFunction);

    // ── HTTP API v2 ────────────────────────────────────────────────────────────
    const httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: "hostahtml-api",
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["content-type", "authorization"],
      },
    });

    const integration = new apigwv2Integrations.HttpLambdaIntegration(
      "ApiIntegration",
      apiFunction
    );

    httpApi.addRoutes({
      path: "/",
      methods: [apigwv2.HttpMethod.GET],
      integration,
    });

    httpApi.addRoutes({
      path: "/upload",
      methods: [apigwv2.HttpMethod.POST],
      integration,
    });

    const stage = httpApi.defaultStage?.node.defaultChild as apigwv2.CfnStage;
    stage.defaultRouteSettings = {
      throttlingRateLimit: 5,
      throttlingBurstLimit: 10,
    };

    // ── GitHub Actions OIDC ────────────────────────────────────────────────────
    const githubOwner =
      this.node.tryGetContext("githubOwner") ??
      "REPLACE_WITH_YOUR_GITHUB_USERNAME";
    const githubRepo = this.node.tryGetContext("githubRepo") ?? "hostahtml";

    const githubProvider = new iam.OpenIdConnectProvider(
      this,
      "GithubOidcProvider",
      {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
      }
    );

    const deployRole = new iam.Role(this, "GithubDeployRole", {
      assumedBy: new iam.WebIdentityPrincipal(
        githubProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": `repo:${githubOwner}/${githubRepo}:ref:refs/heads/main`,
          },
        }
      ),
      description:
        "Least-privilege role for CDK deploy + frontend S3 sync + CloudFront invalidation (see stack inline policy)",
    });

    const cdkAssetsBucketArn = `arn:aws:s3:::cdk-hnb659fds-assets-${Aws.ACCOUNT_ID}-${Aws.REGION}`;
    const cdkBootstrapRoleArn = `arn:aws:iam::${this.account}:role/cdk-hnb659fds-*-role-${this.account}-${this.region}`;
    const stackWildcard = this.formatArn({
      service: "cloudformation",
      resource: "stack",
      resourceName: "HostahtmlStack/*",
    });
    const lambdaFnArn = `arn:aws:lambda:${this.region}:${this.account}:function:HostahtmlStack*`;
    const logGroupArn = `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/HostahtmlStack*`;
    const iamRoleArnPrefix = `arn:aws:iam::${this.account}:role/HostahtmlStack*`;
    const oidcProviderArn = `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`;
    const ssmBootstrapParamArn = this.formatArn({
      service: "ssm",
      resource: "parameter",
      resourceName: "cdk-bootstrap/hnb659fds/version",
    });

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AssumeCdkBootstrapRoles",
        actions: ["sts:AssumeRole"],
        resources: [cdkBootstrapRoleArn],
      })
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "CloudFormationStack",
        actions: [
          "cloudformation:CancelUpdateStack",
          "cloudformation:ContinueUpdateRollback",
          "cloudformation:CreateChangeSet",
          "cloudformation:CreateStack",
          "cloudformation:DeleteChangeSet",
          "cloudformation:DeleteStack",
          "cloudformation:Describe*",
          "cloudformation:ExecuteChangeSet",
          "cloudformation:GetTemplate*",
          "cloudformation:List*",
          "cloudformation:RollbackStack",
          "cloudformation:UpdateStack",
          "cloudformation:UpdateTerminationProtection",
        ],
        resources: [stackWildcard],
      })
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "CloudFormationTemplate",
        actions: ["cloudformation:ValidateTemplate"],
        resources: ["*"],
      })
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "StsWhoAmI",
        actions: ["sts:GetCallerIdentity"],
        resources: ["*"],
      })
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "SsmCdkBootstrapVersion",
        actions: ["ssm:GetParameter", "ssm:GetParameters"],
        resources: [ssmBootstrapParamArn],
      })
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "S3AppAndCdkAssets",
        actions: [
          "s3:AbortMultipartUpload",
          "s3:DeleteBucket",
          "s3:DeleteObject",
          "s3:DeleteObjectVersion",
          "s3:GetBucket*",
          "s3:GetObject*",
          "s3:List*",
          "s3:PutBucket*",
          "s3:PutObject",
          "s3:PutObjectLegalHold",
          "s3:PutObjectRetention",
          "s3:PutObjectTagging",
          "s3:PutObjectVersionTagging",
        ],
        resources: [
          uploadsBucket.bucketArn,
          uploadsBucket.arnForObjects("*"),
          frontendBucket.bucketArn,
          frontendBucket.arnForObjects("*"),
          cdkAssetsBucketArn,
          `${cdkAssetsBucketArn}/*`,
        ],
      })
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "IamForCdkStackRoles",
        actions: [
          "iam:AttachRolePolicy",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:DeleteRolePolicy",
          "iam:DetachRolePolicy",
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:ListAttachedRolePolicies",
          "iam:ListRolePolicies",
          "iam:PutRolePolicy",
          "iam:TagRole",
          "iam:UntagRole",
          "iam:UpdateAssumeRolePolicy",
          "iam:UpdateRole",
          "iam:UpdateRoleDescription",
        ],
        resources: [iamRoleArnPrefix],
      })
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "IamPassRoleToLambda",
        actions: ["iam:PassRole"],
        resources: [iamRoleArnPrefix],
        conditions: {
          StringEquals: {
            "iam:PassedToService": "lambda.amazonaws.com",
          },
        },
      })
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "IamOidcCreate",
        actions: ["iam:CreateOpenIDConnectProvider"],
        resources: ["*"],
      })
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "IamOidcManage",
        actions: [
          "iam:AddClientIDToOpenIDConnectProvider",
          "iam:DeleteOpenIDConnectProvider",
          "iam:GetOpenIDConnectProvider",
          "iam:RemoveClientIDFromOpenIDConnectProvider",
          "iam:TagOpenIDConnectProvider",
          "iam:UntagOpenIDConnectProvider",
          "iam:UpdateOpenIDConnectProviderThumbprint",
        ],
        resources: [oidcProviderArn],
      })
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "LambdaStack",
        actions: [
          "lambda:AddPermission",
          "lambda:CreateFunction",
          "lambda:DeleteFunction",
          "lambda:Get*",
          "lambda:InvokeFunction",
          "lambda:List*",
          "lambda:PublishVersion",
          "lambda:PutFunctionConcurrency",
          "lambda:RemovePermission",
          "lambda:TagResource",
          "lambda:UntagResource",
          "lambda:Update*",
        ],
        resources: [lambdaFnArn],
      })
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "LogsForLambda",
        actions: ["logs:*"],
        resources: [logGroupArn, `${logGroupArn}:*`],
      })
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "ApiGatewayV2",
        actions: [
          "apigateway:DELETE",
          "apigateway:GET",
          "apigateway:PATCH",
          "apigateway:POST",
          "apigateway:PUT",
        ],
        resources: [
          `arn:aws:apigateway:${this.region}::/apis`,
          `arn:aws:apigateway:${this.region}::/apis/*`,
        ],
      })
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "CloudFront",
        actions: [
          "cloudfront:CreateCloudFrontOriginAccessIdentity",
          "cloudfront:CreateDistribution",
          "cloudfront:CreateFunction",
          "cloudfront:CreateInvalidation",
          "cloudfront:CreateOriginAccessControl",
          "cloudfront:DeleteDistribution",
          "cloudfront:DeleteFunction",
          "cloudfront:DeleteOriginAccessControl",
          "cloudfront:Get*",
          "cloudfront:List*",
          "cloudfront:TagResource",
          "cloudfront:UntagResource",
          "cloudfront:UpdateDistribution",
          "cloudfront:UpdateFunction",
          "cloudfront:UpdateOriginAccessControl",
        ],
        resources: [`arn:aws:cloudfront::${this.account}:distribution/*`],
      })
    );

    // ── Outputs ────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "ApiUrl", {
      value: httpApi.apiEndpoint,
      description: "API Gateway URL",
    });
    new cdk.CfnOutput(this, "BucketName", {
      value: uploadsBucket.bucketName,
    });
    new cdk.CfnOutput(this, "FrontendBucketName", {
      value: frontendBucket.bucketName,
    });
    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });
    new cdk.CfnOutput(this, "FrontendUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: "CloudFront URL for the frontend",
    });
    new cdk.CfnOutput(this, "DeployRoleArn", {
      value: deployRole.roleArn,
      description: "Add this as AWS_DEPLOY_ROLE_ARN in GitHub Actions secrets",
    });
  }
}
