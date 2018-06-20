del index.zip
cd lambda
7z a -r ..\index.zip *
cd ..
aws lambda update-function-code --function-name <Your Lambda Function Name> --zip-file fileb://index.zip --region eu-west-1
