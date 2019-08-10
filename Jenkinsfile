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

    def baseName = getBaseName(params)
    patchTemplate(baseName)
    publish(baseUrl, baseName)

    if (params.release_as_version) {
      createGitHubRelease(params.release_as_version, baseName)
    }
  }
}

def getBaseName(params) {
  if (params.release_as_version) {
    "release-${params.release_as_version}"
  } else {
    def shortCommit = sh(
      script: 'git rev-parse --short HEAD',
      returnStdout: true
    ).trim()
    "commit-${shortCommit}"
  }
}

def patchTemplate(baseName) {
  def zipName = getZipName(baseName)

  sh "sed -i 's/INJECTED-DURING-BUILD/$zipName/' cloudformation.yaml"
}

def getZipName(baseName) {
  "${baseName}.zip"
}

def getTemplateName(baseName) {
  "${baseName}-template.yaml"
}

def publish(baseUrl, baseName) {
  echo "Publishing as $baseName"

  withAwsRole('arn:aws:iam::923402097046:role/webapp-deploy-lambda-jenkins') {
    stage('Publish') {
      sh """
        aws s3 cp lambda.zip $baseUrl/${getZipName(baseName)}
        aws s3 cp cloudformation.yaml $baseUrl/${getTemplateName(baseName)}
      """
    }
  }
}

def createGitHubRelease(version, baseName) {
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
            "tag_name": "v$version",
            "target_commitish": "$fullCommit",
            "name": "$version",
            "body": "Code (zip) available at https://capra-webapp-deploy-lambda-releases.s3.amazonaws.com/${getZipName(baseName)}\\n\\nCloudFormation template available at https://capra-webapp-deploy-lambda-releases.s3.amazonaws.com/${getTemplateName(baseName)}",
            "draft": false,
            "prerelease": false
          }' \\
          -H "Authorization: token \$GITHUB_TOKEN" \\
          https://api.github.com/repos/capraconsulting/webapp-deploy-lambda/releases
      """
    }
  }
}
