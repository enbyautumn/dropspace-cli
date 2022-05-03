#!/usr/bin/env node

import chalk from 'chalk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { debug } from 'util';
import FormData from 'form-data';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

try {
    console.log(chalk.green('Starting dropspace-cli...\n'));
    var domain;
    var task;
    var param;
    var args = process.argv.slice(2);
    if (args.length < 3) {
        console.log(chalk.bgRed('No or not enough arguments provided.\n'));
        console.log(chalk.yellow('Usage: ') + chalk.bgYellow('dropspace-cli <task> <domain> <file or fileID>'));
        console.log(chalk.yellow('Example: ') + chalk.bgYellow('dropspace-cli upload dropspace.test super-important-file.png\n'));
        process.exit(1);
    }
    task = args[0];
    domain = args[1];
    param = args[2];
    if (task === 'upload') {
        //Check if domain is valid
        //Check if file exists
        //Chunk file
        //Upload chunks to domain
        //After all chunks uploaded, compare checksums
        console.log(chalk.yellow('Checking DropSpace on ') + chalk.bgYellow(domain));
        //Make get call to {domain}/cli/domain-check
        //If domain is valid, continue
        //If domain is invalid, exit
        await axios.get('http://' + domain + '/cli/domain-check')
            .then((response) => {
                if (response.data == 'Domain valid') {
                    console.log(chalk.green('Domain valid.\n'));
                } else {
                    console.log(chalk.red('Domain invalid.\n'));
                    process.exit(1);
                }
            })
            .catch((error) => {
                console.log(chalk.red('Domain invalid.\n'));
                process.exit(1);
            });
        console.log(chalk.yellow('Reading file...\n'));
        //Read file

        // The cookie and token stuff are for the csrf stuff and can be ignored
            
        // let cookie = await axios.get('http://' + domain + '/sanctum/csrf-cookie').then(response => {
        //     // return response.headers['set-cookie'].join("; ")//[0].match(/(?<==).*?(?=;)/)[0];
        //     return response.headers['set-cookie'][0].match(/.*?;/)[0] + response.headers['set-cookie'][1].match(/.*?(?=;)/)[0]
        // })

        // console.log(cookie)

        // let token = await axios.get('http://' + domain + '/cli/csrf-token').then(response => {
        //     return response.data;
        // })


        let buff = fs.readFileSync(param);
        let chunks = createChunks(buff, 2)

        for (let i = 0; i < chunks.length; i++) {
            let file = chunks[i];
            let chunkNumber = i + 1;
            let totalChunks = chunks.length;
            let chunkSize = file.length;
            let totalSize = buff.length;
            let identifier = `${totalSize}-${path.basename(param).replace(".", "")}`;
            let fileName = path.basename(param);
            let form = new FormData();
            form.append('file', file, {
                filename: fileName,
            });
            form.append('resumableChunkNumber', chunkNumber);
            form.append('resumableTotalChunks', totalChunks);
            form.append('resumableChunkSize', chunkSize);
            form.append('resumableTotalSize', totalSize);
            form.append('resumableIdentifier', identifier);
            form.append('resumableFilename', fileName);
            form.append('resumableType', 'application/octet-stream');
            
            let formHeaders = form.getHeaders();

            axios.post('http://' + domain + '/upload-chunks', form, {
                headers: {
                    ...formHeaders,
                },
            })
            .then(response => {
                if (response.data.success) {
                    console.log(chalk.green('Chunk uploaded successfully.\n'));
                }
                if (response.data.identifier) {
                    console.log('http://' + domain + '/download/' + response.data.identifier);
                }
            })
            .catch(error => {
                console.log(error.response.status);
            });
        }

    }
    if (task === 'download') {
    }
}
catch (e) {
    console.log(chalk.red('\nError: ') + chalk.bgRed(e));
}

function createChunks(file, cSize) {
    let startPointer = 0;
    let endPointer = file.length;
    let chunks = [];
    while (startPointer < endPointer) {
        let newStartPointer = startPointer + cSize;
        chunks.push(file.subarray(startPointer, newStartPointer));
        startPointer = newStartPointer;
    }
    return chunks;
}