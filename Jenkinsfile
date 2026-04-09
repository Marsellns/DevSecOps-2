pipeline {
    agent any

    stages {

        stage('Check File') {
            steps {
                sh 'ls -la'
            }
        }

        stage('Install') {
            steps {
                sh 'npm install || true'
            }
        }

    }
}
