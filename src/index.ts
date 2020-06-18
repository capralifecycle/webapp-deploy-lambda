import * as iam from "@aws-cdk/aws-iam"
import * as lambda from "@aws-cdk/aws-lambda"
import * as s3 from "@aws-cdk/aws-s3"
import * as cdk from "@aws-cdk/core"
import * as path from "path"

interface Props {
  /**
   * S3 bucket where the artifacts to be deployed are stored.
   */
  buildsBucket: s3.IBucket
  /**
   * CloudFront Distribution ID to be invalidated after deploy.
   *
   * @default - none
   */
  distributionId?: string
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
}

/**
 * Resource to deploy a webapp from a build artifact into an existing
 * S3 Bucket and CloudFront Distribution.
 */
export class WebappDeploy extends cdk.Construct {
  readonly deployFn: lambda.Function

  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id)

    const environment: Record<string, string> = {
      DEPLOY_LOG_BUCKET_URL: `s3://${props.webBucket.bucketName}/deployments.log`,
      EXPIRE_SECONDS: (props.pruneDeploymentsOlderThan ?? cdk.Duration.days(5))
        .toSeconds()
        .toString(),
      TARGET_BUCKET_URL: `s3://${props.webBucket.bucketName}/web`,
    }

    if (props.distributionId != null) {
      environment.CF_DISTRIBUTION_ID = props.distributionId
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
      runtime: lambda.Runtime.PYTHON_3_7,
      timeout: cdk.Duration.minutes(2),
      initialPolicy: [
        new iam.PolicyStatement({
          actions: ["s3:HeadObject", "s3:GetObject"],
          resources: [props.buildsBucket.arnForObjects("*")],
        }),
        new iam.PolicyStatement({
          actions: ["s3:PutObject", "s3:DeleteObject"],
          resources: [props.webBucket.arnForObjects("web/*")],
        }),
        new iam.PolicyStatement({
          actions: ["s3:GetObject", "s3:PutObject"],
          resources: [props.webBucket.arnForObjects("deployments.log")],
        }),
        new iam.PolicyStatement({
          actions: ["s3:List*"],
          resources: [props.webBucket.bucketArn],
        }),
        new iam.PolicyStatement({
          actions: ["cloudfront:CreateInvalidation"],
          // Cannot be restricted
          resources: ["*"],
        }),
      ],
    })
  }
}
