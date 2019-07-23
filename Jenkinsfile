#!/usr/bin/env groovy

// See https://github.com/capralifecycle/jenkins-pipeline-library
@Library('cals') _

def jobProperties = [
  parameters([
    stringParam(
      defaultValue: '',
      description: 'Release as this version. E.g. 1.0.0',
      name: 'release_as_version'
    ),
  ]),
]

buildConfig([
  jobProperties: jobProperties,
  slack: [
    channel: '#cals-dev-info',
    teamDomain: 'cals-capra',
  ],
]) {
  dockerNode {
    stage('Checkout source') {
      checkout scm
    }

    def img = docker.image('circleci/python:3.7')
    img.pull() // Ensure latest version.
    img.inside {
      stage('Install dependencies') {
        sh '''
          python3 -m venv .venv
          . .venv/bin/activate
          pip install -r requirements.txt
        '''
      }

      stage('Lint') {
        sh '''
          . .venv/bin/activate
          make lint
        '''
      }

      stage('Test') {
        sh '''
          . .venv/bin/activate
          make test
        '''
      }

      stage('Build') {
        sh 'make build'
      }
    }

    def baseUrl = 's3://capra-webapp-deploy-lambda-releases'

    if (params.release_as_version) {
      def filename = "release-${params.release_as_version}.zip"

      publish("$baseUrl/$filename")

      createGitHubRelease(params.release_as_version, filename)
    } else {
      def shortCommit = sh(
        script: 'git rev-parse --short HEAD',
        returnStdout: true
      ).trim()

      publish("$baseUrl/commit-${shortCommit}.zip")
    }
  }
}

def publish(url) {
  echo "Uploading to $url"

  withAwsRole('arn:aws:iam::923402097046:role/webapp-deploy-lambda-jenkins') {
    stage('Publish') {
      sh """
        aws s3 cp lambda.zip $url
      """
    }
  }
}

def createGitHubRelease(version, filename) {
  withCredentials([
    string(credentialsId: 'github-calsci-token', variable: 'GITHUB_TOKEN'),
  ]) {
    stage('Create GitHub release') {
      echo "Releasing as $version"

      def fullCommit = sh(
        script: 'git rev-parse HEAD',
        returnStdout: true
      ).trim()

      sh """
        curl \\
          --fail \\
          --data '{
            "tag_name": "$version",
            "target_commitish": "$fullCommit",
            "name": "$version",
            "body": "Available at https://capra-webapp-deploy-lambda-releases.s3.amazonaws.com/$filename",
            "draft": false,
            "prerelease": false
          }' \\
          -H "Authorization: token \$GITHUB_TOKEN" \\
          https://api.github.com/repos/capraconsulting/webapp-deploy-lambda/releases
      """
    }
  }
}
