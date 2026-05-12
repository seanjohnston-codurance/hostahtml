#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { HostahtmlStack } from "../lib/hostahtml-stack";

const app = new cdk.App();
new HostahtmlStack(app, "HostahtmlStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
