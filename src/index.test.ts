import * as iam from "@aws-cdk/aws-iam"
import * as s3 from "@aws-cdk/aws-s3"
import * as cdk from "@aws-cdk/core"
import "jest-cdk-snapshot"
import { WebappDeploy } from "."

test("WebappDeploy", () => {
  const app = new cdk.App()
  const stack1 = new cdk.Stack(app, "Stack1", {
    env: {
      account: "123456789123",
      region: "us-east-1",
    },
  })
  const stack2 = new cdk.Stack(app, "Stack2", {
    env: {
      account: "112233445566",
      region: "eu-west-1",
    },
  })

  const buildsBucket = new s3.Bucket(stack1, "BuildsBucket", {
    bucketName: cdk.PhysicalName.GENERATE_IF_NEEDED,
  })
  const webBucket = new s3.Bucket(stack1, "WebBucket", {
    bucketName: cdk.PhysicalName.GENERATE_IF_NEEDED,
  })

  const callerRole = new iam.Role(stack2, "CallerRole", {
    assumedBy: new iam.AnyPrincipal(),
  })

  const webappDeploy = new WebappDeploy(stack2, "WebappDeploy", {
    buildsBucket,
    distributionId: "EKJ2IPY1KTEAR1",
    webBucket,
  })

  webappDeploy.deployFn.grantInvoke(callerRole)

  expect(stack2).toMatchCdkSnapshot()
})
