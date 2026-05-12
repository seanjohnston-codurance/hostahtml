import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as path from "path";

export class HostahtmlStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── S3 bucket ──────────────────────────────────────────────────────────────
    // Private bucket — uploaded files are accessed via pre-signed URLs
    const uploadsBucket = new s3.Bucket(this, "UploadsBucket", {
      bucketName: `hostahtml-uploads-${this.account}-${this.region}`,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ── Lambda ─────────────────────────────────────────────────────────────────
    const apiFunction = new lambdaNode.NodejsFunction(this, "ApiFunction", {
      entry: path.join(__dirname, "../lambda/handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        BUCKET_NAME: uploadsBucket.bucketName,
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
        allowHeaders: ["content-type"],
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
    // Replace githubOwner in cdk.json with your GitHub username before deploying.
    const githubOwner =
      this.node.tryGetContext("githubOwner") ??
      "REPLACE_WITH_YOUR_GITHUB_USERNAME";
    const githubRepo =
      this.node.tryGetContext("githubRepo") ?? "hostahtml";

    const githubProvider = new iam.OpenIdConnectProvider(
      this,
      "GithubOidcProvider",
      {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
      }
    );

    // Scoped to pushes to main on this specific repo only
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
      // AdministratorAccess is acceptable for a personal playground account.
      // Scope this down before using in a shared or production environment.
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
      ],
    });

    // ── Outputs ────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "ApiUrl", {
      value: httpApi.apiEndpoint,
      description: "API Gateway URL — paste this into app.html",
    });
    new cdk.CfnOutput(this, "BucketName", {
      value: uploadsBucket.bucketName,
    });
    new cdk.CfnOutput(this, "DeployRoleArn", {
      value: deployRole.roleArn,
      description: "Add this as AWS_DEPLOY_ROLE_ARN in GitHub Actions secrets",
    });
  }
}
