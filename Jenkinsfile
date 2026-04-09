pipeline {
    agent any

    stages {

        stage('Clone') {
            steps {
                git 'https://github.com/Marsellns/DevSecOps-2.git'
            }
        }

        stage('Check File') {
            steps {
                sh 'ls -la'
            }
        }

    }
}
