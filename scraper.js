var cheerio = require('cheerio');
var request = require('request');
var jsonfile = require('jsonfile')
var fs = require('fs')

var url = "http://www.hearthpwn.com/cards?display=1&filter-premium=1&filter-set=103&filter-unreleased=1";
// var url = "http://www.hearthpwn.com/cards?display=1&filter-premium=1&filter-set=103&filter-unreleased=1&page=2"
var outputFile = "cards.json"
var cards = [];
var pendingRequests = 0;

var createCardData = function ($, entries) {
  entries.each(function(index, item) {
    var entry = this;
    
    //Temp fetching images seems broken??
    // var card = getCardAttributes($, entry, $(entry).find(".col-name").children().first().text());
    // cards.push(card);
    // saveCards();

    url = "http://www.hearthpwn.com" + $(entry).find(".col-name").children().first().attr("href");
    pendingRequests++;
     request(url, function(error, response, html){
      if(!error && response.statusCode == 200){
        var $ = cheerio.load(html);
        var cardName = $(entry).find(".col-name").children().first().text();
        console.log("fetching data for..." + cardName);
        fetchImage($, cardName);
        var card = getCardAttributes($, entry, cardName);
        cards.push(card);
      }
    })
  })
}

var fetchImage = function ($, cardName) {
  var imgEl = $(".hscard-static");
  var uri = imgEl.attr("src");

  console.log("fetching " + cardName);
  request.head(uri, function(err, res, body){
    if(!err){
      request(uri).pipe(fs.createWriteStream("img/" + cardName + ".png")).on('close', imageDownloaded);
    }
  });
}

var imageDownloaded = function () {
  console.log("imageDownloaded...");
  pendingRequests--;
  console.log(pendingRequests);
  if(pendingRequests <= 0) {
    saveCards();
  }
}

var getRarity = function (rarity) {
  switch (rarity) {
    case 1: return "common";
    case 2: return "free";
    case 3: return "rare";
    case 4: return "epic";
    case 5: return "legendary";
  }
}

var getCardAttributes = function ($, entry, cardName) {
  var colName = $(entry).find(".col-name").children().first();
  // var cardName = colName.text();
  var cardType = $(entry).find(".col-type").text();
  var cardClass = $(entry).find(".col-class").text();
    if(cardClass == "") {
    cardClass = "Neutral"
  }

  //Replace mystical whitespace
  cardClass = cardClass.replace(/\s+/, "");

  var cardCost = parseInt($(entry).find(".col-cost").text());
  var cardAttack = parseInt($(entry).find(".col-attack").text());
  var cardHealth = parseInt($(entry).find(".col-health").text());
  var cardRarity = getRarity(parseInt(/\d{1}/.exec(/rarity-\d{1}/.exec(colName.attr("class")))));

  return { name: cardName, cost: cardCost, type: cardType, class: cardClass, attack: cardAttack, health: cardHealth, rarity: cardRarity };
}

var scrapeCardData = function () {
  request(url, function(error, response, html){
  if(!error && response.statusCode == 200) {
    var $ = cheerio.load(html);
    createCardData($, $(".odd"));
    createCardData($, $(".even"));
    }
  });
}

var saveCards = function () {
  console.log("saving card data...");
  var outputJson = { cardData: cards };
  jsonfile.writeFile(outputFile, outputJson, {spaces: 1}, function (err) {
    if(err) {
      console.error(err);
    }
  })
}

scrapeCardData();


