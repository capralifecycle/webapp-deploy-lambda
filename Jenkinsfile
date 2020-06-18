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
      stage('Lint and test python code') {
        sh '''
          python3 -m venv .venv
          . .venv/bin/activate
          pip install -r requirements.txt
          make py-lint py-test
        '''
      }
    }

    insideToolImage("node:12-alpine") {
      stage('Install dependencies and build') {
        sh 'npm ci'
      }

      stage('Lint and test') {
        sh 'npm run lint'
        sh 'npm run test'
      }

      // We only run semantic-release on the release branches,
      // as we do not want credentials to be exposed to the job
      // on other branches or in PRs.
      if (env.BRANCH_NAME ==~ /^(master|\d+\.(\d+|x)(\.x)?)$/) {
        stage("Semantic release") {
          withSemanticReleaseEnv {
            sh "npm run semantic-release"
          }
        }
      }
    }
  }
}
