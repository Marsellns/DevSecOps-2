pipeline {
    agent any

    stages {

        stage('Check File') {
            steps {
                sh 'ls -la'
            }
            stage('Install') {
    steps {
        sh 'npm install'
    }
}
         stage('Run App') {
    steps {
        sh 'node server.js &'
    }
}
         stage('Build Docker') {
    steps {
        sh 'docker build -t devsecops-app .'
    }
}
        }

    }
}
