import * as cdk from "aws-cdk-lib"
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"
import * as iam from "aws-cdk-lib/aws-iam"
import * as s3 from "aws-cdk-lib/aws-s3"
import "jest-cdk-snapshot"
import * as path from "path"
import { fileURLToPath } from "url"
import { WebappDeploy } from "."
import { Source } from "./source"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test("WebappDeploy", () => {
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

  expect(stack).toMatchCdkSnapshot()
})

test("WebappDeploy with source", () => {
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

  expect(stack).toMatchCdkSnapshot()
})
