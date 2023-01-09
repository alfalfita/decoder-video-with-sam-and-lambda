'use strict';

const AWS = require('aws-sdk')

// Obtiene el valor de la variable de entorno MEDIA_ENDPOINT que está configurada en template.yml
const mediaConvert = new AWS.MediaConvert({
    endpoint: process.env.MEDIA_ENDPOINT
});
// Obtiene el nombre del bucket donde se enviaran los videos procesados de la variable de entorno TRANSCODED_VIDEO_BUCKET que está configurada en template.yml
const outputBucketName = process.env.TRANSCODED_VIDEO_BUCKET;

exports.handler = async (event) => {

    const s3Event = JSON.parse(event.Records[0].body)

    try {
        const key = s3Event.Records[0].s3.object.key;
        const sourceKey = decodeURIComponent(key.replace(/\+/g, ' '));
        const outputKey = sourceKey.split('.')[0];

        // Establece la ubicación del video de entrada para la definición de trabajo de MediaConvert
        const input = 's3://' + s3Event.Records[0].s3.bucket.name + '/' + key;

        // Create S3 service object
        const outputBucket = new AWS.S3({apiVersion: '2006-03-01'});

        // Create the parameters for calling createBucket
        var bucketParams = {
          Bucket : outputBucketName
        };

        // call S3 to create the bucket
        outputBucket.createBucket(bucketParams, function(err, data) {
          if (err) {
            console.log("Error", err);
          } else {
            console.log("Success", data.Location);
          }
        });

        // Establece el bucket de salida para los nuevos archivos de video
        const output = 's3://' + outputBucketName + '/' + outputKey + '/';


        const job = {
          //  Obtiene el ARN del rol MediaConvert que se especifica en template.yml
            "Role": process.env.MEDIA_ROLE,
            "Settings": {
                "Inputs": [{
                    "FileInput": input,
                    // Especifica el selector de audio para la definición de trabajo de MediaConvert. De manera predeterminada, nombrará una sola pista de audio en el video.
                    "AudioSelectors": {
                        "Audio Selector 1": {
                            "SelectorType": "TRACK",
                            "Tracks": [1]
                        }
                    }
                }],
                "OutputGroups": [{
                    "Name": "File Group",
                    "Outputs": [{
                        "Preset": "System-Generic_Hd_Mp4_Avc_Aac_16x9_1920x1080p_24Hz_6Mbps",
                        "Extension": "mp4",
                        "NameModifier": "_16x9_1920x1080p_24Hz_6Mbps"
                    }, {
                        "Preset": "System-Generic_Hd_Mp4_Avc_Aac_16x9_1280x720p_24Hz_4.5Mbps",
                        "Extension": "mp4",
                        "NameModifier": "_16x9_1280x720p_24Hz_4.5Mbps"
                    }, {
                        "Preset": "System-Generic_Sd_Mp4_Avc_Aac_4x3_640x480p_24Hz_1.5Mbps",
                        "Extension": "mp4",
                        "NameModifier": "_4x3_640x480p_24Hz_1.5Mbps"
                    }],
                    "OutputGroupSettings": {
                        "Type": "FILE_GROUP_SETTINGS",
                        "FileGroupSettings": {
                            "Destination": output
                        }
                    }
                }]
            }
        };

        const mediaConvertResult = await mediaConvert.createJob(job).promise();
        console.log('mediaConvertResult ' , mediaConvertResult);

    } catch (error) {
        console.error(error);
    }
};