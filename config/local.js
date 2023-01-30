const {Command} = require('commander')
const path = require("path");
const chalk = require("chalk");
const colorize = require("json-colorizer");
const inquirer = require("inquirer");
const lodash = require('lodash');
const ipfsClient = require("ipfs-http-client");
const fs = require("fs/promises");

async function main() {
    await init();

    const program = new Command()

    // commands
    program
        .command('mint <image-path>')
        .description('create a new NFT from an image file')
        .option('-n, --name <name>', 'The name of the NFT')
        .option('-d, --description <desc>', 'A description of the NFT')
        .option('-o, --owner <address>', 'The ethereum address that should own the NFT.' +
            'If not provided, defaults to the first signing address.')
        .option('-c, --creation-info', 'include the creator address and block number the NFT was minted')
        .action(createNFT)

    program
        .command('add <file-path>')
        .description('add a file to ipfs')
        .action(addIpfsByFile)

    // The hardhat and getconfig modules both expect to be running from the root directory of the project,
    // so we change the current directory to the parent dir of this script file to make things work
    // even if you call minty from elsewhere
    const rootDir = path.join(__dirname, '..')
    process.chdir(rootDir)

    await program.parseAsync(process.argv)
}

// ================================ cmmd =================================
async function createNFT(imagePath, options) {
    // prompt for missing details if not provided as cli args
    const answers = await promptForMissing(options, {
        name: {
            message: 'Enter a name for your new NFT: '
        },

        description: {
            message: 'Enter a description for your new NFT: '
        }
    })

    lodash.assign(answers, lodash.pick(options, ['owner']))
    console.log(`imagePath ${imagePath} options ${JSON.stringify(options)}`)
    /*const minty = await MakeMinty()*/
    /*const nft = await minty.createNFTFromAssetFile(imagePath, answers)*/
    const nft = {
        tokenId: 1,
        metadataURI: 'metadata URI',
        metadataGatewayURL: 'metadata gateway URL',
        assetURI: 'asset URI',
        assetGatewayURL: 'asset gateway URL',
        metadata: {
            image: 'nft-image',
            name: 'nft-name',
            description: 'nft-description',
        }
    };

    console.log('🌿 Minted a new NFT: ')
    alignOutput([
        ['Token ID:', chalk.green(nft.tokenId)],
        ['Metadata Address:', chalk.blue(nft.metadataURI)],
        ['Metadata Gateway URL:', chalk.blue(nft.metadataGatewayURL)],
        ['Asset Address:', chalk.blue(nft.assetURI)],
        ['Asset Gateway URL:', chalk.blue(nft.assetGatewayURL)],
    ])
    console.log('NFT Metadata:')
    console.log(colorize(JSON.stringify(nft.metadata), colorizeOptions))
}

async function promptForMissing(cliOptions, prompts) {
    const questions = []
    for (const [name, prompt] of Object.entries(prompts)) {
        prompt.name = name
        prompt.when = (answers) => {
            if (cliOptions[name]) {
                answers[name] = cliOptions[name]
                return false
            }
            return true
        }
        questions.push(prompt)
    }
    return inquirer.prompt(questions)
}

function alignOutput(labelValuePairs) {
    const maxLabelLength = labelValuePairs
        .map(([l, _]) => l.length)
        .reduce((len, max) => len > max ? len : max)
    for (const [label, value] of labelValuePairs) {
        console.log(label.padEnd(maxLabelLength+1), value)
    }
}

const colorizeOptions = {
    pretty: true,
    colors: {
        STRING_KEY: 'blue.bold',
        STRING_LITERAL: 'green'
    }
}

// ================================ ipfs =================================
let _initialized = false;
const ipfsClientOptions = {
    ipfsApiUrl: 'http://localhost:5001',
}
const ipfsAddOptions = {
    cidVersion: 1,
    hashAlg: 'sha2-256'
}

async function init() {
    if (_initialized) {
        return
    }

    // create a local IPFS node
    this.ipfs = ipfsClient(ipfsClientOptions.ipfsApiUrl)

    _initialized = true
}

async function addIpfsByFile(filename, options) {
    const content = await fs.readFile(filename)
    return addIpfsByData(content, {...options, path: filename})
}

async function addIpfsByData(content, options) {
    const filePath = options.path || 'asset.bin'
    const basename = path.basename(filePath)

    const ipfsPath = '/nft/' + basename
    const {cid: assetCid} = await this.ipfs.add({path: ipfsPath, content}, ipfsAddOptions)
    console.log(`filePath ${filePath} ipfsPath ${ipfsPath} cid ${assetCid}`)
}

// ============================ entry point ==============================
// ---- main entry point when running as a script
// make sure we catch all errors
main().then(() => {
    process.exit(0)
}).catch(err => {
    console.error(err)
    process.exit(1)
})
