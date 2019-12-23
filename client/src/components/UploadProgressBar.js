import React from 'react';
import { ProgressBar } from 'react-bootstrap';

// TODO refactor this to be reusable

/**
 * 
 * @param {{upload: {name: string, state: number, uploadProgress: number, processProgress: number}}} props 
 */
export default function UploadProgressBar(props) {
    let upload = props.upload;
    let condition = "Unknown";
    let uploadVariant = "info";
    let uploadAnimate = false;
    let processVariant = "info";
    let processAnimate = false;
    switch (upload.state) {
        case 0:
            condition = "Waiting to upload";
            break;
        case 1:
            condition = "Uploading...";
            uploadAnimate = true;
            break;
        case 2:
            condition = "Uploaded!";
            uploadVariant = "success";
            break;
        case 7:
            condition = "Upload error from server";
            uploadVariant = "danger";
            break;
        case 8:
            condition = "Upload error on client";
            uploadVariant = "danger";
            break;
        case 9:
            condition = "Upload cancelled";
            uploadVariant = "warning";
            break;
        case 10:
            condition = "Queued processing";
            uploadVariant = "success";
            break;
        case 11:
            condition = "Processing...";
            uploadVariant = "success";
            processAnimate = true;
            break;
        case 19:
            condition = "Processing failed";
            uploadVariant = "success";
            processVariant = "danger";
            break;
        case 20:
            condition = "Processed!";
            uploadVariant = "success";
            processVariant = "success";
            break;
        default:
            console.error('ERROR: Hit unintended state in upload')
            break;
    }
    return <>
        <p>{upload.name}: {condition}</p>
        <ProgressBar>
            <ProgressBar animated={uploadAnimate} striped variant={uploadVariant} now={upload.uploadProgress * 50} key={1} />
            <ProgressBar animated={processAnimate} striped variant={processVariant} now={upload.processProgress * 50} key={2} />
        </ProgressBar>
    </>;
}