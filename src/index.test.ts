import * as path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { cdkTemplate, configureCdkSnapshots } from "@liflig/cdk-snapshot/node"
import * as cdk from "aws-cdk-lib"
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"
import * as iam from "aws-cdk-lib/aws-iam"
import * as s3 from "aws-cdk-lib/aws-s3"
import { WebappDeploy } from "./index.ts"
import { Source } from "./source.ts"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

configureCdkSnapshots()

test("WebappDeploy", (t) => {
  const app = new cdk.App()
  const stack = new cdk.Stack(app, "Stack", {
    env: {
      account: "123456789123",
      region: "eu-west-1",
    },
  })

  const buildsBucket = s3.Bucket.fromBucketName(
    stack,
    "BuildsBucket",
    "builds-bucket",
  )
  const webBucket = s3.Bucket.fromBucketName(stack, "WebBucket", "web-bucket")

  const distribution = cloudfront.Distribution.fromDistributionAttributes(
    stack,
    "Distribution",
    {
      distributionId: "EKJ2IPY1KTEAR1",
      domainName: "example.com",
    },
  )

  const callerRole = new iam.Role(stack, "CallerRole", {
    assumedBy: new iam.AnyPrincipal(),
  })

  const webappDeploy = new WebappDeploy(stack, "WebappDeploy", {
    buildsBucket,
    distribution,
    webBucket,
  })

  webappDeploy.deployFn.grantInvoke(callerRole)

  t.assert.snapshot(cdkTemplate(stack))
})

test("WebappDeploy with source", (t) => {
  const app = new cdk.App()
  const stack = new cdk.Stack(app, "Stack", {
    env: {
      account: "123456789123",
      region: "eu-west-1",
    },
  })

  const webBucket = s3.Bucket.fromBucketName(
    stack,
    "WebBucket",
    "example-bucket",
  )

  const distribution = cloudfront.Distribution.fromDistributionAttributes(
    stack,
    "Distribution",
    {
      distributionId: "EKJ2IPY1KTEAR1",
      domainName: "example.com",
    },
  )

  new WebappDeploy(stack, "WebappDeploy", {
    distribution,
    source: Source.asset(path.join(__dirname, "../example-assets/source")),
    webBucket,
  })

  t.assert.snapshot(cdkTemplate(stack))
})
