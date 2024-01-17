const {
	MINT_PREFIX,
	URL
} = require('../../common/config.js');
const Web3 = require('web3');

const web3 = new Web3(URL);

async function processTransaction(tx) {

	const calldata = tx.input;

	if (!(calldata.startsWith(MINT_PREFIX) && tx.from === tx.to)) {
		return;
	}

	try {
		const msg = web3.utils.hexToUtf8(calldata);
		const transactionMsg = JSON.parse(msg);

		const transaction = {
			hash: tx.hash,
			blockNumber: tx.blockNumber,
			from: tx.from,
			to: tx.to,
			msg: msg,
			op: 'mint',
			amt: transactionMsg.tick, 
			tick: transactionMsg.amt
		}

		console.log(`Indexed transaction ${tx.hash}:${transaction}`);

	} catch (error) {
		console.error(`Error processing transaction ${tx.hash}:`, error);
	} finally {

	}
}

let isProcessing = false;

async function processBlock(blockNumber) {
	console.log(`Processing block number: ${blockNumber}`);
	try {
		const block = await web3.eth.getBlock(blockNumber.toString(), true);
		if (block && Array.isArray(block.transactions)) {
			const transactions = block.transactions;
			for (const tx of transactions) {
				await processTransaction(tx);
			}
		} else {
			console.error(`Block ${blockNumber} does not contain transactions array or is undefined.`);
		}
	} catch (error) {
		console.error(`Error processing block ${blockNumber}:`, error);
	}
}

let latestBlockNumber;

// Check for new blocks
async function checkNewBlocks() {
	if (!isProcessing) {
		isProcessing = true;
		try {
			const currentBlockNumber = await web3.eth.getBlockNumber();
			if (currentBlockNumber > latestBlockNumber) {
				const batchSize = 1000;
				for (let startBlock = latestBlockNumber + BigInt(1); startBlock <= currentBlockNumber; startBlock +=
					BigInt(batchSize)) {
					const endBlock = BigInt(Math.min(Number(startBlock) + batchSize - 1,
						currentBlockNumber));
					for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
						await processBlock(blockNumber);
					}
					latestBlockNumber = endBlock;
				}
			}
		} catch (error) {
			console.error('Error checking new blocks:', error);
		} finally {
			isProcessing = false;
		}
	}
	setTimeout(checkNewBlocks, 10);
}

// Main function
async function main() {
	let startBlock = process.argv[2] ? BigInt(process.argv[2]) : BigInt(await web3.eth.getBlockNumber());
	latestBlockNumber = startBlock;

	// Start the periodic task to check for new blocks
	await checkNewBlocks();
}

main().catch(console.error);
