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

      // TODO: Release
    }
  }
}
