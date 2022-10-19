const NFT_DOMAIN = "https://nfts.snowx.com/";
const LAMBDA_URL = "https://4tngehx454ifwnnzd6oywceafu0kmait.lambda-url.us-west-1.on.aws/";
//const LAMBDA_URL = "https://gbr47ur4z3js6k2uv7vclir7fa0ohgwy.lambda-url.us-west-1.on.aws/";
window.onload = async function () {
    web3 = new Web3(web3.currentProvider);
    ethereum.enable();
    await web3.eth.getAccounts().then(function (acc) { accounts = acc });
    document.getElementById("result").textContent = "Welcome, " + accounts[0];

    getMyCollections();
    //gas = await fetch("https://gasstation-mainnet.matic.network").then(res => res.json());
}

function displayWalletCheckMessage() {
    document.getElementById("overlay").style.display = '';
    document.getElementById("overlay-message").textContent = "Confirm this transaction in your wallet.";
}

function displayWaitMessage(error, transactionHash, message) {
    if (error) {
        document.getElementById("overlay").style.display = '';
        document.getElementById("overlay-message").textContent = error.message;
        console.log(error);
    } else {
        document.getElementById("overlay").style.display = '';
        document.getElementById("overlay-button").style.display = 'none';
        document.getElementById("overlay-message").innerHTML = "⌛ " + message + "<br /><br />TxHash: " + transactionHash;
    }
}

function displayCompleteMessage(receipt, message) {
    document.getElementById("overlay-button").style.display = '';
    document.getElementById("overlay-message").innerHTML = "✅ " + message + "<br /><br />TxHash: " + receipt.transactionHash;
}

function displayProgress(percentComplete, message) {
    document.getElementById("overlay").style.display = '';
    document.getElementById("overlay-message").innerHTML = "⌛ Uploading... " + percentComplete + "%";
}

function ack(event) {
    event.preventDefault();
    document.getElementById("overlay").style.display = 'none';
}

function whoami() {
    let contract = new web3.eth.Contract(whoamiAbi, whoamiAddress);
    contract.methods.whoami().call({
        from: accounts[0]
    }).then(function (res) {
        document.getElementById("result").textContent = res;
        console.log(res);
    });
}

function hello() {
    let contract = new web3.eth.Contract(abiHello, addressHello);
    contract.methods.hello().call(function (err, res) {
        document.getElementById("result").textContent = res;
        console.log(res);
    });

}

function getData() {
    let contract = new web3.eth.Contract(abiHello, addressHello);
    contract.methods.getData().call(function (err, res) {
        document.getElementById("result").textContent = res;
        console.log(res);
    });
}

function setData(data) {
    let contract = new web3.eth.Contract(abiHello, addressHello);
    contract.methods.setData(data).send({
        from: accounts[0]
    }, function (error, transactionHash) {
        document.getElementById("result").textContent = transactionHash;
        console.log(error);
    }).then(function (receipt) {
        console.log(receipt);
        alert("done")
    });
}

function createNFTCollection(name, symbol, royaltyFeePercent) {
    displayWalletCheckMessage();
    let contract = new web3.eth.Contract(factoryAbi, factoryAddress);
    contract.methods
        .createNFTCollection(name, symbol, royaltyFeePercent)
        .send({
            from: accounts[0],
            // gasPrice: gas.standard.toFixed(0) * web3.utils.unitMap.gwei
        }, function (error, transactionHash) {
            displayWaitMessage(error, transactionHash, "Creating collection...");
        }).then(function (receipt) {
            displayCompleteMessage(receipt, "Collection created!");
            console.log(receipt);
            document.getElementsByName("collection-address")[0].value = receipt.events[0].address;
            document.getElementsByName("collection-address")[1].value = receipt.events[0].address;
            document.getElementsByName("collection-address")[2].value = receipt.events[0].address;
            document.getElementsByName("collection-address")[3].value = receipt.events[0].address;
            document.getElementsByName("collection-address")[4].value = receipt.events[0].address;
            document.getElementById("collection-title").value = name;
            document.getElementById("collection-base-uri").value = NFT_DOMAIN + receipt.events[0].address + "/";
            document.getElementById("result").textContent = "✅ Collection created. Address: " + receipt.events[0].address;
            getMyCollections();
        });
}

async function uploadCollectionMetadata(snowxAddress, title, artist, pfp, desc, event) {
    event.preventDefault();
    snowxAddress = snowxAddress.toLowerCase();

    let pfpType = pfp.type ? pfp.type : "application/octet-stream";
    let pfpFileName = snowxAddress + '/icon';
    const pfpUploadUrl = await fetch(LAMBDA_URL + '?filename=' + pfpFileName + '&type=' + pfpType).then(res => res.json());

    await fetch(pfpUploadUrl.url, {
        method: "PUT",
        body: pfp,
        headers: {
            "Content-Type": pfpType
        }
    });

    let jsonFileName = snowxAddress + '/metadata';
    const jsonUploadUrl = await fetch(LAMBDA_URL + '?filename='
        + jsonFileName + '&type=application/json').then(res => res.json());

    await fetch(jsonUploadUrl.url, {
        method: "PUT",
        body: JSON.stringify({
            "title": title,
            "artist": artist,
            "icon": NFT_DOMAIN + snowxAddress + '/icon',
            "description": desc,
        }),
        headers: {
            "Content-Type": "application/json"
        }
    });
    document.getElementById("result").textContent = "✅ Metadata uploaded: "
        + NFT_DOMAIN + snowxAddress + '/metadata';
}

function getMyCollections() {
    document.getElementById("collections").innerHTML = "";
    let contract = new web3.eth.Contract(factoryAbi, factoryAddress);
    contract.methods.getMyCollections().call({
        from: accounts[0]
    }, function (error, transactionHash) {
        if (error) {
            document.getElementById("overlay").style.display = '';
            document.getElementById("overlay-message").innerHTML = "Check your network. <br />"
                + "Please reload the page after connecting to the Ethereum Mainnet.";
        }
    }
    ).then(function (res) {
        res.forEach(e => {
            document.getElementById("collections").innerHTML += "<li><a href='#' onclick='getCollectionInfo(\"" + e + "\")'>" + e + "</a></li>";
        });
    });
}

function getTokens(snowxAddress, count) {
    document.getElementById("token-info-table").innerHTML = "<th>#</th><th>Token ID</th><th>Owner</th>";

    let contract = new web3.eth.Contract(snowxAbi, snowxAddress);
    for (let tokenId = 1; tokenId <= count; tokenId++) {
        let tokenUri, owner;

        contract.methods.tokenURI(tokenId).call(function (err, res) {
            tokenUri = res;
            contract.methods.ownerOf(tokenId).call(function (err, res) {
                owner = res;
                if (tokenUri && owner) {
                    document.getElementById("token-info-table").innerHTML +=
                        "<tr><td>"
                        + tokenId
                        + "</td><td><a href='"
                        + tokenUri
                        + "'>"
                        + tokenId
                        + "</a></td > "
                        + "</td > <td>"
                        + owner + "</td>";
                }
            });
        });



    }

    /*
    contract.methods.getTokens().call({
        from: accounts[0]
    }).then(function (res) {
        document.getElementById("tokens").innerHTML = "";
        res.forEach(e => {
            document.getElementById("token-info").innerHTML += "<li>" + e + "</li>";
        });
        console.log(res);
    });
    */
}

function getCollectionInfo(snowxAddress) {
    document.getElementsByName("collection-address")[0].value = snowxAddress;
    document.getElementsByName("collection-address")[1].value = snowxAddress;
    document.getElementsByName("collection-address")[2].value = snowxAddress;
    document.getElementsByName("collection-address")[3].value = snowxAddress;
    document.getElementsByName("collection-address")[4].value = snowxAddress;
    document.getElementById("collection-base-uri").value = NFT_DOMAIN + snowxAddress + "/";
    let contract = new web3.eth.Contract(snowxAbi, snowxAddress);
    document.getElementById("selected-collection-address").textContent = snowxAddress;
    contract.methods.name().call(function (err, res) {
        document.getElementById("selected-collection-name").textContent = res;
    });
    contract.methods.symbol().call(function (err, res) {
        document.getElementById("selected-collection-symbol").textContent = res;
    });
    contract.methods.numTokens().call(function (err, res) {
        document.getElementById("selected-collection-total").textContent = res;
        document.getElementById("metadata-id").value = parseInt(res) + 1;
        document.getElementById("mint-token-id").value = parseInt(res) + 1;
    });
    contract.methods.royaltyFeePercent().call(function (err, res) {
        document.getElementById("selected-collection-royalty").textContent = res + "%";
    });
}

function mintToken(snowxAddress) {
    displayWalletCheckMessage();
    let contract = new web3.eth.Contract(snowxAbi, snowxAddress);
    contract.methods.mint(accounts[0]).send({
        from: accounts[0],
        // gasPrice: gas.standard.toFixed(0) * web3.utils.unitMap.gwei
    }, function (error, transactionHash) {
        displayWaitMessage(error, transactionHash, "Minting token...");
    }).then(function (receipt) {
        displayCompleteMessage(receipt, "Token minted!");
        console.log(receipt);
        document.getElementById("result").textContent = "Minted: " + receipt.transactionHash;
    });
}

async function uploadMetadata(tokenId, snowxAddress, event) {
    event.preventDefault();
    document.getElementById("overlay").style.display = "";
    document.getElementById("overlay-button").style.display = 'none';
    document.getElementById("overlay-message").innerHTML = "Uploading metadata...";
    snowxAddress = snowxAddress.toLowerCase();

    let thumbnail = document.getElementById("metadata-image-file").files[0];
    let artwork = document.getElementById("metadata-artwork-file").files[0];

    let thumbnailExt = getExt(thumbnail.name);
    let thumbnailFileName = snowxAddress + '/' + tokenId + '-thumbnail' + '.' + thumbnailExt;

    let artworkExt = getExt(artwork.name);
    let artworkFileName = snowxAddress + '/' + tokenId + '-artwork' + '.' + artworkExt;

    let jsonFileName = snowxAddress + '/' + tokenId;
    const jsonUploadUrl = await fetch(LAMBDA_URL + '?filename='
        + jsonFileName + '&type=application/json').then(res => res.json());

    await fetch(jsonUploadUrl.url, {
        method: "PUT",
        body: JSON.stringify({
            "name": document.getElementById("metadata-name").value,
            "description": document.getElementById("metadata-desc").value,
            "image": NFT_DOMAIN + thumbnailFileName,
            "animation_url": NFT_DOMAIN + artworkFileName
        }),
        headers: {
            "Content-Type": "application/json"
        }
    });

    document.getElementById("overlay").style.display = "";
    document.getElementById("overlay-message").innerHTML = "Metadata uploaded";
    document.getElementById("overlay-button").style.display = '';
    document.getElementById("result").textContent = "Metadata uploaded: "
        + NFT_DOMAIN + snowxAddress + '/' + tokenId;
}

function marketplaceApprove(snowxAddress, tokenId) {
    displayWalletCheckMessage();
    let contract = new web3.eth.Contract(snowxAbi, snowxAddress);
    contract.methods.approve(marketplaceAddress, tokenId).send({
        from: accounts[0],
        // gasPrice: gas.standard.toFixed(0) * web3.utils.unitMap.gwei
    }, function (error, transactionHash) {
        displayWaitMessage(error, transactionHash, "Approving token...");
        document.getElementById("result").textContent = "TransactionID: " + transactionHash;
        console.log(error);
    }).then(function (receipt) {
        displayCompleteMessage(receipt, "Token approved!");
        console.log(receipt);
    });
}

function marketplaceStatus(snowxAddress, tokenId) {
    let contract = new web3.eth.Contract(marketplaceAbi, marketplaceAddress);
    contract.methods.getListing(snowxAddress, tokenId).call(function (err, res) {
        if (res.seller != "0x0000000000000000000000000000000000000000") {
            document.getElementById("listing-status-table").innerHTML =
                "<tr><th>Price</th><td>" + Web3.utils.fromWei(res.price, 'ether') + " ETH</td></tr>"
                + "<tr><th>Seller</th><td>" + res.seller + "</td></tr>";
        } else {
            document.getElementById("listing-status-table").innerHTML =
                "<tr><th>Price</th><td>Not listed</td></tr>"
                + "<tr><th>Seller</th><td>Not listed</td></tr>";
        }
    });
}

function marketplaceSale(snowxAddress, tokenId, priceEth) {
    displayWalletCheckMessage();
    let contract = new web3.eth.Contract(marketplaceAbi, marketplaceAddress);
    contract.methods.listItem(snowxAddress, tokenId, priceEth).send({
        from: accounts[0],
        // gasPrice: gas.standard.toFixed(0) * web3.utils.unitMap.gwei
    }, function (error, transactionHash) {
        displayWaitMessage(error, transactionHash, "Listing token...");
        document.getElementById("result").textContent = "TransactionID: " + transactionHash;
        console.log(error);
    }).then(function (receipt) {
        displayCompleteMessage(receipt, "Token listed!");
        console.log(receipt);
        document.getElementById("result").textContent = "Listed: " + receipt.transactionHash;
    });
}

function marketplaceCancel(snowxAddress, tokenId) {
    displayWalletCheckMessage();
    let contract = new web3.eth.Contract(marketplaceAbi, marketplaceAddress);
    contract.methods.cancelListing(snowxAddress, tokenId).send({
        from: accounts[0],
        // gasPrice: gas.standard.toFixed(0) * web3.utils.unitMap.gwei
    }, function (error, transactionHash) {
        displayWaitMessage(error, transactionHash, "Cancelling token...");
        document.getElementById("result").textContent = "TransactionID: " + transactionHash;
        console.log(error);
    }).then(function (receipt) {
        displayCompleteMessage(receipt, "Token cancelled!");
        console.log(receipt);
        document.getElementById("result").textContent = "Cancelled: " + receipt.transactionHash;
    });
}

function marketplaceBuy(snowxAddress, tokenId, valueWei) {
    displayWalletCheckMessage();
    let contract = new web3.eth.Contract(marketplaceAbi, marketplaceAddress);
    contract.methods.buyItem(snowxAddress, tokenId).send({
        from: accounts[0],
        value: valueWei,
        // gasPrice: gas.standard.toFixed(0) * web3.utils.unitMap.gwei
    }, function (error, transactionHash) {
        displayWaitMessage(error, transactionHash, "Buying token...");
        document.getElementById("result").textContent = "TransactionID: " + transactionHash;
        console.log(error);
    }).then(function (receipt) {
        displayCompleteMessage(receipt, "Token bought!");
        console.log(receipt);
        document.getElementById("result").textContent = "Bought: " + receipt.transactionHash;
    });
}

function burn(snowxAddress, tokenId) {
    displayWalletCheckMessage();
    let contract = new web3.eth.Contract(snowxAbi, snowxAddress);
    contract.methods.burn(tokenId).send({
        from: accounts[0],
    }, function (error, transactionHash) {
        displayWaitMessage(error, transactionHash, "Burning token...");
        document.getElementById("result").textContent = "TransactionID: " + transactionHash;
        console.log(error);
    }).then(function (receipt) {
        displayCompleteMessage(receipt, "Token burned!");
        console.log(receipt);
        document.getElementById("result").textContent = "Burned: " + receipt.transactionHash;
    });
}

function getExt(filename) {
    let pos = filename.lastIndexOf('.');
    if (pos === -1) return '';
    return filename.slice(pos + 1);
}

function explainListToken() {
    document.getElementById("result").innerHTML = "To list your token on the marketplace, you need to approve the marketplace to transfer your token. Then you can list your token for sale.";
}

async function uploadThumbnail(snowxAddress, tokenId) {
    snowxAddress = snowxAddress.toLowerCase();
    displayWaitMessage(null, null, "Uploading thumbnail...");
    thumbnail = document.getElementById("metadata-image-file").files[0];
    let thumbnailExt = getExt(thumbnail.name);
    let thumbnailType = thumbnail.type ? thumbnail.type : "application/octet-stream";
    let thumbnailFileName = snowxAddress + '/' + tokenId + '-thumbnail' + '.' + thumbnailExt;
    const thumbnailUploadUrl = await fetch(LAMBDA_URL + '?filename=' + thumbnailFileName + '&type=' + thumbnailType).then(res => res.json());

    let xhrThumbnail = new XMLHttpRequest();
    xhrThumbnail.upload.onprogress = updateProgress;
    xhrThumbnail.upload.addEventListener("load", function (evt) {
        displayCompleteMessage(null, "Thumbnail uploaded!");
    }, false);
    xhrThumbnail.open("PUT", thumbnailUploadUrl.url, true);
    xhrThumbnail.setRequestHeader('Content-Type', thumbnailType);
    xhrThumbnail.send(thumbnail);
}

async function uploadGlb(snowxAddress, tokenId) {
    snowxAddress = snowxAddress.toLowerCase();
    displayWaitMessage(null, null, "Uploading GLB...");
    artwork = document.getElementById("metadata-artwork-file").files[0];
    let artworkExt = getExt(artwork.name);
    let artworkType = artwork.type ? artwork.type : "application/octet-stream";
    let artworkFileName = snowxAddress + '/' + tokenId + '-artwork' + '.' + artworkExt;
    const artworkUploadUrl = await fetch(LAMBDA_URL + '?filename='
        + artworkFileName + '&type=' + artworkType).then(res => res.json());

    let xhrArtwork = new XMLHttpRequest();
    xhrArtwork.upload.onprogress = updateProgress;
    xhrArtwork.upload.addEventListener("load", function (evt) {
        displayCompleteMessage(null, "Artwork uploaded!");
    }, false);
    xhrArtwork.open("PUT", artworkUploadUrl.url, true);
    xhrArtwork.setRequestHeader('Content-Type', artworkType);
    xhrArtwork.send(artwork);
}

function updateProgress(evt) {
    if (evt.lengthComputable) {  // evt.loaded the bytes the browser received
        // evt.total the total bytes set by the header
        // jQuery UI progress bar to show the progress on screen
        var percentComplete = (evt.loaded / evt.total) * 100;
        document.getElementById("overlay-message").innerHTML = "⌛ " + "Uploading...<br />" + Math.ceil(percentComplete) + "%";
    }
}   