pipeline {
    agent any

    environment {
        APP_NAME = "devsecops-app"
        PORT = "3000"
    }

    stages {

        stage('Check File') {
            steps {
                sh 'ls -la'
            }
        }

        stage('Install Dependency') {
            steps {
                sh 'npm install'
            }
        }

        stage('SAST - Security Scan') {
            steps {
                sh 'npm audit || true'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $APP_NAME .'
            }
        }

        stage('Deploy Container') {
            steps {
                sh '''
                docker stop $APP_NAME || true
                docker rm $APP_NAME || true
                docker run -d -p $PORT:$PORT --name $APP_NAME $APP_NAME
                '''
            }
        }

        stage('DAST - Dynamic Test') {
            steps {
                sh '''
                docker run --rm -t owasp/zap2docker-stable zap-baseline.py \
                -t http://localhost:$PORT || true
                '''
            }
        }

        stage('Load Testing') {
            steps {
                sh 'ab -n 200 -c 10 http://localhost:$PORT/ || true'
            }
        }

        stage('Monitoring') {
            steps {
                sh 'docker ps'
                sh 'docker stats --no-stream'
            }
        }

    }

    post {
        always {
            echo 'Pipeline selesai (success / fail tetap jalan)'
        }
        success {
            echo 'SUCCESS: Semua tahap berhasil'
        }
        failure {
            echo 'FAILED: Cek console output'
        }
    }
}
