import type * as iam from "aws-cdk-lib/aws-iam"
import type * as s3 from "aws-cdk-lib/aws-s3"
import * as s3Assets from "aws-cdk-lib/aws-s3-assets"
import type * as constructs from "constructs"

// This is mostly based on aws-s3-deployment from aws-cdk.

export interface SourceConfig {
  /**
   * The source bucket to deploy from.
   */
  readonly bucket: s3.IBucket

  /**
   * An S3 object key in the source bucket that points to a zip file.
   */
  readonly zipObjectKey: string
}

/**
 * Bind context for ISources
 */
export interface SourceContext {
  /**
   * The role for the handler
   *
   * @default - no policy is modified
   */
  readonly handlerRole?: iam.IRole
}

/**
 * Represents a source for bucket deployments.
 */
export interface ISource {
  /**
   * Binds the source to a bucket deployment.
   */
  bind(scope: constructs.Construct, context?: SourceContext): SourceConfig
}

/**
 * Specifies bucket deployment source.
 *
 * Usage:
 *
 *     Source.bucket(bucket, key)
 *     Source.asset('/local/path/to/directory')
 *     Source.asset('/local/path/to/a/file.zip')
 *
 */
export class Source {
  /**
   * Uses a .zip file stored in an S3 bucket as the source for the destination bucket contents.
   * @param bucket The S3 Bucket
   * @param zipObjectKey The S3 object key of the zip file with contents
   */
  public static bucket(bucket: s3.IBucket, zipObjectKey: string): ISource {
    return {
      bind: (_: constructs.Construct, context?: SourceContext) => {
        if (!context) {
          throw new Error("To use a Source.bucket(), context must be provided")
        }

        if (context.handlerRole) {
          bucket.grantRead(context.handlerRole)
        }

        return { bucket, zipObjectKey }
      },
    }
  }

  /**
   * Uses a local asset as the deployment source.
   * @param path The path to a local .zip file or a directory
   */
  public static asset(path: string, options?: s3Assets.AssetOptions): ISource {
    return {
      bind(scope: constructs.Construct, context?: SourceContext): SourceConfig {
        if (!context) {
          throw new Error("To use a Source.asset(), context must be provided")
        }

        let id = 1
        while (scope.node.tryFindChild(`Asset${id}`)) {
          id++
        }
        const asset = new s3Assets.Asset(scope, `Asset${id}`, {
          path,
          ...options,
        })
        if (!asset.isZipArchive) {
          throw new Error(
            "Asset path must be either a .zip file or a directory",
          )
        }

        if (context.handlerRole) {
          asset.grantRead(context.handlerRole)
        }

        return {
          bucket: asset.bucket,
          zipObjectKey: asset.s3ObjectKey,
        }
      },
    }
  }

  private constructor() {}
}
