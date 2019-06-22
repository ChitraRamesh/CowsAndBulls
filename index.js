const API_KEY = '8dc8fda3';
//module.exports = API_KEY;

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');

var arrayOf3letterWords = [ "pig", 'hit','yet','new','loo','met','shy','run','zoo','fox']
var arrayOf4letterWords = [ 'post','news',"yelp","glee","mood",'slid','rude','gawk','slow','mind']
var client = require('redis').createClient(process.env.REDIS_URL);

client.on('connect', function() {
    console.log('Redis client connected');
});
client.on('error', function (err) {
    console.log('Something went wrong with ReDis ' + err);
});


const server = express();
server.use(bodyParser.urlencoded({
    extended: true
}));

server.use(bodyParser.json());

calculateCowAndBull = (word, saidWord) => {
    //convert words into arrays.
    //iterate thru word and match for saidword

    var arr_word = word.toUpperCase().split('')
    var arr_saidWord = saidWord.toUpperCase().split('')
    var bull = 0;
    var cow = 0;


    for(i = 0; i < saidWord.length; i++) {
        var cowfound = false;
        for(j = 0; j < word.length; j++) {
            if(arr_word[i] == arr_saidWord[j]) {
                if(i == j) //same position
                {
                bull++; 
                cowfound = false;
                break; 
                }
                else {
                cowfound = true;
                }
                
            }
                
        }
    if (cowfound) cow++;  

    }
    return [bull, cow];
}

processWords = (myWord, saidWord, lifespanCount, res) => {
    console.log(myWord, saidWord);
    myWord = myWord.toUpperCase();
    saidWord = saidWord.toUpperCase();
    //check if it is the same word
    if(myWord.indexOf(saidWord) == 0) {
      client.set('myWord', null); //reset the word
       return res.json({
              fulfillmentText: myWord + " is right. If you want to play again, say the number of letters ",
              "outputContexts": [
              {
                "name": myContext,
                "lifespanCount": 0 //end game.
                 
              }
            ]
          }); 
      } 
    var responseText = "" ;
 
    //calculate cows and bulls.
    const [bulls, cows] = calculateCowAndBull(myWord, saidWord);
    responseText = saidWord + " has " + bulls + " bulls and " + cows + " cows ";
    if(lifespanCount == undefined) 
    {
      client.set('myWord', null);//reset the word
      responseText += " No more attempts ";
    }
    else 
       responseText += " You have " + lifespanCount + "attempts";
    return res.json({
              fulfillmentText:   responseText
          });
}

server.post('/get-cows-and-bulls', (req, res) => {

  //console.log(req.body.queryResult.queryText);
  console.log(req.body.queryResult.outputContexts[0].name);
  
  //get the context readyState
  let countOfContexts = req.body.queryResult.outputContexts.length;
  let myContext  = "sayletter-followup";
  var lifespanCount = 0;
  var lengthOfWord = 0;
  var i;
  //get the information about the context so that it can be used when sending the response.
  for (i = 0; i < countOfContexts; i++) { 
		if(req.body.queryResult.outputContexts[i].name.indexOf(myContext) > 1)
		{
				myContext = req.body.queryResult.outputContexts[i].name;
				lifespanCount = req.body.queryResult.outputContexts[i].lifespanCount;
				lengthOfWord = req.body.queryResult.outputContexts[i].parameters.lengthOfword;
				break;
		}
	}
  
let saidWord = req.body.queryResult.parameters.theword;
if(saidWord.length != lengthOfWord)  
{
    responseText  = saidWord + " is not a " + lengthOfWord + " letter word"  
    responseText += " You have " + lifespanCount + "attempts";
    return res.json({
         
        fulfillmentText:  responseText         
    });
}
let myWord = "ERR" 
myWord = client.get('myWord', function (error, result) {
    if (error || (result ==  null)) {
       //word not set yet
       // returns a random integer from 0 to 9]
       myWord = arrayOf3letterWords[Math.floor(Math.random() * 10)];           
       client.set('myWord', myWord);
       console.log("My new word is " + myWord)
       
    }
    else
    {
       myWord = result;
       console.log("My already set word is " + myWord)
    }

    return processWords(myWord, saidWord, lifespanCount,res)
     
});

//let myWord = arrayOf3letterWords[Math.floor(Math.random() * 10)];     // returns a random integer from 0 to 9]
 
    
     
    
});

server.listen((process.env.PORT || 8000), () => {
    console.log("Cows and bulls Server is up and running...");
});
