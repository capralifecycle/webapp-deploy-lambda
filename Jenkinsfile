#!/usr/bin/env groovy

// See https://github.com/capralifecycle/jenkins-pipeline-library
@Library('cals') _

buildConfig([
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

    stage('Validate template') {
      validateTemplate()
    }
  }
}

def validateTemplate() {
  // Must define region so the aws command doesn't complain.
  sh "AWS_DEFAULT_REGION=eu-central-1 aws cloudformation validate-template --template-body file://cloudformation.yaml"
}
