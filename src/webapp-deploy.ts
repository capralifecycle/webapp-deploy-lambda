import * as constructs from "constructs"
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"
import * as iam from "aws-cdk-lib/aws-iam"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as cdk from "aws-cdk-lib"
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources"
import * as path from "path"
import { ISource } from "./source"

export interface WebappDeployProps {
  /**
   * Optional S3 bucket that can be used for deployment from outside CDK.
   *
   * If specified a policy is added so the deploy function can read from
   * the bucket.
   *
   * @default - none
   */
  buildsBucket?: s3.IBucket
  /**
   * CloudFront Distribution to be invalidated after deploy.
   *
   * @default - none
   */
  distribution?: cloudfront.IDistribution
  /**
   * Regex for patterns of files to be discarded during deployment.
   *
   * Example: `\.map$` will exclude `js/myapp-1b22c248f.js.map`.
   *
   * @default - none
   */
  excludePattern?: string
  /**
   * The time when a deployment is considered old and will be deleted
   * unless it is the newest old deployment.
   *
   * @default - 5 days
   */
  pruneDeploymentsOlderThan?: cdk.Duration
  /**
   * Name of the lambda function to be created.
   *
   * @default cdk.PhysicalName.GENERATE_IF_NEEDED
   */
  functionName?: string
  /**
   * Name of S3 bucket where the contents of the artifacts will be deployed.
   * The files will be deployed under the key "web", which is then expected
   * to be the origin for the CloudFront distribution
   */
  webBucket: s3.IBucket
  /**
   * Specific artifact to be deployed to the bucket during CDK deployment.
   *
   * @default - none
   */
  source?: ISource
}

/**
 * Resource to deploy a webapp from a build artifact into an existing
 * S3 Bucket and CloudFront Distribution.
 */
export class WebappDeploy extends constructs.Construct {
  readonly deployFn: lambda.Function

  constructor(
    scope: constructs.Construct,
    id: string,
    props: WebappDeployProps,
  ) {
    super(scope, id)

    const environment: Record<string, string> = {
      DEPLOY_LOG_BUCKET_URL: `s3://${props.webBucket.bucketName}/deployments.log`,
      EXPIRE_SECONDS: (props.pruneDeploymentsOlderThan ?? cdk.Duration.days(5))
        .toSeconds()
        .toString(),
      TARGET_BUCKET_URL: `s3://${props.webBucket.bucketName}/web`,
    }

    if (props.distribution != null) {
      environment.CF_DISTRIBUTION_ID = props.distribution.distributionId
    }

    if (props.excludePattern != null) {
      environment.EXCLUDE_PATTERN = props.excludePattern
    }

    this.deployFn = new lambda.Function(this, "Resource", {
      code: lambda.Code.fromAsset(path.join(__dirname, "../dist")),
      environment,
      functionName: props.functionName ?? cdk.PhysicalName.GENERATE_IF_NEEDED,
      handler: "webapp_deploy.main.handler",
      reservedConcurrentExecutions: 1,
      runtime: lambda.Runtime.PYTHON_3_8,
      timeout: cdk.Duration.minutes(2),
      initialPolicy: [
        new iam.PolicyStatement({
          actions: ["cloudfront:CreateInvalidation"],
          // Cannot be restricted
          resources: ["*"],
        }),
      ],
    })

    props.webBucket.grantReadWrite(this.deployFn)

    if (props.buildsBucket) {
      props.buildsBucket.grantRead(this.deployFn)
    }

    if (props.source) {
      const source = props.source.bind(this, {
        handlerRole: this.deployFn.role!,
      })

      new AwsCustomResource(this, "CustomResource", {
        onUpdate: {
          service: "Lambda",
          action: "invoke",
          physicalResourceId: PhysicalResourceId.of("webapp-deploy"),
          parameters: {
            FunctionName: this.deployFn.functionName,
            Payload: cdk.Stack.of(scope).toJsonString({
              artifactS3Url: `s3://${source.bucket.bucketName}/${source.zipObjectKey}`,
            }),
          },
        },
        policy: AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            actions: ["lambda:InvokeFunction"],
            resources: [this.deployFn.functionArn],
          }),
        ]),
        installLatestAwsSdk: false,
      })
    }
  }
}
