import * as cdk from "aws-cdk-lib";
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
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
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
        // SPA: serve index.html for any 403/404 so client-side routing works
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      }
    );

    // ── Lambda ─────────────────────────────────────────────────────────────────
    const apiFunction = new lambdaNode.NodejsFunction(this, "ApiFunction", {
      entry: path.join(__dirname, "../lambda/handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
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
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
      ],
    });

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
