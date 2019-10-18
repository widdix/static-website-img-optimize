# Static Website: Image optimization

Works together with https://templates.cloudonaut.io/en/stable/static-website/

Optimizes `.png`, `.jpg`, and `.jpeg` images  and enerates `.webp` images at the edge.

## Installation Guide

> Requires Node.js v10!

```
cd lambda-src
npm ci --production
cd ..
aws --region us-east-1 cloudformation package --s3-bucket $BUCKET_NAME --template-file lambdaedge-img-optimize.yaml --output-template-file .lambdaedge-img-optimize.yaml
aws cloudformation deploy
aws --profile widdix-michael --region us-east-1 cloudformation deploy --template-file .lambdaedge-img-optimize.yaml --stack-name lambdaedge-img-optimize --capabilities CAPABILITY_IAM
```

Copy the `OriginRequestLambdaEdgeFunctionVersionARN` output of the stack and use it with [static-website/static-website](https://templates.cloudonaut.io/en/stable/static-website/).
