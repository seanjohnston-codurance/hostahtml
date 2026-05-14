import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { beforeAll, describe, expect, it } from "vitest";
import { HostahtmlStack } from "./hostahtml-stack";

let template: Template;

function createTemplate(): Template {
  const app = new cdk.App({
    context: { googleClientId: "dummy.apps.googleusercontent.com" },
  });
  const stack = new HostahtmlStack(app, "HostahtmlStack", {
    env: { account: "123456789012", region: "eu-west-2" },
  });
  return Template.fromStack(stack);
}

describe("HostahtmlStack", () => {
  beforeAll(() => {
    template = createTemplate();
  });

  it("keeps uploaded HTML private and expires it after seven days", () => {
    template.hasResource("AWS::S3::Bucket", {
      DeletionPolicy: "Retain",
      UpdateReplacePolicy: "Retain",
      Properties: Match.objectLike({
        BucketName: "hostahtml-uploads-123456789012-eu-west-2",
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
        LifecycleConfiguration: {
          Rules: [
            {
              Id: "expire-after-7-days",
              Status: "Enabled",
              ExpirationInDays: 7,
            },
          ],
        },
      }),
    });
  });

  it("serves SvelteKit static fallbacks through CloudFront", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        DefaultRootObject: "index.html",
        CustomErrorResponses: [
          {
            ErrorCode: 403,
            ResponseCode: 200,
            ResponsePagePath: "/200.html",
          },
          {
            ErrorCode: 404,
            ResponseCode: 200,
            ResponsePagePath: "/200.html",
          },
        ],
      }),
    });
  });

  it("applies default API throttling at the HTTP API stage", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Stage", {
      DefaultRouteSettings: {
        ThrottlingBurstLimit: 10,
        ThrottlingRateLimit: 5,
      },
    });
  });

  it("passes required runtime configuration to the API Lambda", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs20.x",
      Environment: {
        Variables: Match.objectLike({
          BUCKET_NAME: {
            Ref: Match.stringLikeRegexp("UploadsBucket"),
          },
          GOOGLE_CLIENT_ID: "dummy.apps.googleusercontent.com",
          TOKENS_TABLE_NAME: {
            Ref: Match.stringLikeRegexp("ShareTokensTable"),
          },
          SHARE_BASE_URL: {
            "Fn::GetAtt": [Match.stringLikeRegexp("HttpApi"), "ApiEndpoint"],
          },
        }),
      },
    });
  });

  it("expires share-token records with DynamoDB TTL", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TimeToLiveSpecification: {
        AttributeName: "expiresAt",
        Enabled: true,
      },
    });
  });

  it("indexes share-token records by owner and expiry for dashboard listing", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: "OwnerExpiresAtIndex",
          KeySchema: [
            { AttributeName: "ownerUserId", KeyType: "HASH" },
            { AttributeName: "expiresAt", KeyType: "RANGE" },
          ],
        }),
      ]),
    });
  });

  it("allows dashboard API methods through CORS", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
      CorsConfiguration: Match.objectLike({
        AllowMethods: Match.arrayWith(["GET", "POST", "PATCH", "DELETE", "OPTIONS"]),
      }),
    });
  });

  it("routes nested share-token paths to the API Lambda", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /t/{token}/{proxy+}",
    });
  });

  it("routes dashboard share APIs to the API Lambda", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /shares",
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "PATCH /shares/{token}",
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "DELETE /shares/{token}",
    });
  });

  it("tags resources with owner and service", () => {
    const buckets = template.findResources("AWS::S3::Bucket");
    expect(Object.values(buckets)).not.toHaveLength(0);
    for (const bucket of Object.values(buckets)) {
      expect(bucket.Properties.Tags).toEqual(
        expect.arrayContaining([
          { Key: "owner", Value: "sean-johnston" },
          { Key: "service", Value: "hostahtml" },
        ])
      );
    }
  });
});
