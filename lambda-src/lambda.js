const sharp = require('sharp');
const AWS = require('aws-sdk');

const MAX_ALLOWED_BODY_SIZE = 1330000 / 8 * 6; // max 1.33 MB in base64

function fallbackResponse(cf) {
  return cf.request; // proxy to origin
}

function imageResponse(cf, optimized, type) {
  if (optimized.length > MAX_ALLOWED_BODY_SIZE) {
    console.info(`[WARNING] ${cf.request.uri} can not be optimized: body size in base64 > 1.33 MB`);
    return fallbackResponse(cf);
  }
  return {
    status: '200',
    statusDescription: 'OK',
    headers: {
      'content-type': [{
        key: 'Content-Type',
        value: type
      }],
      'cache-control': [{
        key: 'Cache-Control',
        value: 'max-age=86400'
      }]
    },
    body: optimized.toString('base64'),
    bodyEncoding: 'base64'
  };
}

function extractBucketName(domainName) {
  if (domainName.endsWith('.s3.amazonaws.com')) {
    return domainName.split('.').slice(0, -3).join('.');
  } else {
    return domainName.split('.').slice(0, -4).join('.');
  }
}

exports.handler = async function(event) {
  const s3 = new AWS.S3({apiVersion: '2006-03-01'});
  const cf = event.Records[0].cf;
  if ('s3' in cf.request.origin) {
    try {
      const bucket = extractBucketName(cf.request.origin.s3.domainName);
      const key = `${cf.request.origin.s3.path}${cf.request.uri.substr(1)}`;
      if (key.endsWith('.png')) {
        const raw = await s3.getObject({
          Bucket: bucket,
          Key: key
        }).promise().then(data => data.Body);
        const optimized = await sharp(raw)
          .png({
            quality: 80
          })
          .toBuffer();
        return imageResponse(cf, optimized, 'image/png');
      }
      if(key.endsWith('.jpg') || cf.request.uri.endsWith('.jpeg')) {
        const raw = await s3.getObject({
          Bucket: bucket,
          Key: key
        }).promise().then(data => data.Body);
        const optimized = await sharp(raw)
          .jpeg({
            quality: 80
          })
          .toBuffer();
        return imageResponse(cf, optimized, 'image/jpeg');
      }
      if(key.endsWith('.webp')) {
        const keyWithoutExtension = key.slice(0, -4);
        const raw = await s3.getObject({
          Bucket: bucket,
          Key: keyWithoutExtension + 'png'
        }).promise().then(data => data.Body)
          .catch(err => {
            if (err.code === 'NoSuchKey') {
              return s3.getObject({
                Bucket: bucket,
                Key: keyWithoutExtension + 'jpg'
              }).promise().then(data => data.Body);
            }
            return Promise.reject(err);
          })
          .catch(err => {
            if (err.code === 'NoSuchKey') {
              return s3.getObject({
                Bucket: bucket,
                Key: keyWithoutExtension + 'jpeg'
              }).promise().then(data => data.Body);
            }
            return Promise.reject(err);
          });
        const optimized = await sharp(raw)
          .webp({
            quality: 80
          })
          .toBuffer();
        return imageResponse(cf, optimized, 'image/webp');
      }
    } catch (err) {
      if (err.code === 'NoSuchKey') {
        return {
          status: '404',
          statusDescription: 'Not Found'
        };
      }
      throw err;
    }
  }
  return fallbackResponse(cf);
};
