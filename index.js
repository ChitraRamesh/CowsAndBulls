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
    var posOfHandledLetters =  word.toUpperCase().split('')

    for(i = 0; i < saidWord.length; i++) {
        var cowfound = false;
        for(j = 0; j < word.length; j++) {
           //document.write (" <br>word " + arr_word[i]  + "said " + arr_saidWord[j])
            if(arr_word[i] == arr_saidWord[j]) {
                if(i == j)  {//same position
                
                    bull++; 
                    cowfound = false;
                    posOfHandledLetters[j] = 1
                    break; 
                }
                else {
                if(posOfHandledLetters[j] != 1)
                         cowfound = true;
                }
                
            }
                
        }
    if (cowfound) cow++;  
      
    }
    return [bull, cow];
}


processWords = (sessionId, myWord, saidWord,result, lifespanCount,myContext, res) => {
    console.log(myWord, saidWord);
    myWord = myWord.toUpperCase();
    saidWord = saidWord.toUpperCase();
    //check if it is the same word
    if(myWord.indexOf(saidWord) == 0) {
      client.del(sessionId); //reset the word
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
    client.mset(sessionId,myWord + "## " +  result + " " + responseText); //keep adding to cache for later hint retrieval
    //Add it for Hint retrival
   // client.
    if(lifespanCount == undefined) 
    {
      client.del(sessionId);//reset the word
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
  let sessionId = req.body.session
  let sayLetterContext  = "sayletter-followup";
  let repeatContext = "repeat";
  var lifespanCount = 0;
  var lengthOfWord = 0;
  var i;
  var supportedContext = false;
  var myContext = "";
  //get the information about the context so that it can be used when sending the response.
  for (i = 0; i < countOfContexts; i++) { 
		if(req.body.queryResult.outputContexts[i].name.indexOf(sayLetterContext) > 1)
		{
				myContext = req.body.queryResult.outputContexts[i].name;
				lifespanCount = req.body.queryResult.outputContexts[i].lifespanCount;
                lengthOfWord = req.body.queryResult.outputContexts[i].parameters.lengthOfword;
                supportedContext = true;
				break;
        }

        if(req.body.queryResult.outputContexts[i].name.indexOf(repeatContext) > 1)
		{
				myContext = req.body.queryResult.outputContexts[i].name;		
                supportedContext = true;
				break;
        }

        
    }
  if(!supportedContext)
      {
        return res.json({
            fulfillmentText:   "Don't know what you are saying "
        });
      }


let saidWord = req.body.queryResult.parameters.theword;
if(myContext != repeatContext && saidWord.length != lengthOfWord )  
{
    responseText  = saidWord + " is not a " + lengthOfWord + " letter word"  
    responseText += " You have " + lifespanCount + "attempts";          
    return res.json({
         
        fulfillmentText:  responseText         
    });
}
let myWord = "ERR" 
myWord = client.get(sessionId, function (error, result) {
    if (error || (result ==  null)) {
       //word not set yet
       if (myContext == repeatContext)  
       {
        return res.json({
         
            fulfillmentText:  "No words yet"     
        });
       }   

       // returns a random integer from 0 to 9]
       myWord = "test"
       if(lengthOfWord == 3)
             myWord = arrayOf3letterWords[Math.floor(Math.random() * 10)];   
       if(lengthOfWord == 4)     
            myWord = arrayOf4letterWords[Math.floor(Math.random() * 10)];     
       client.set(sessionId, myWord);
       console.log("My new word is " + myWord);
       result = myWord;
       
    }
    else
    {
       //result has both the word and all the clues so far.
       //get just the word . it is separated by ##
       result =   result.slice(0, result.indexOf("##",0) );
       myWord = result;
       console.log("My already set word is " + myWord)
    }
    if (myContext == repeatContext)  
    {
        return res.json({
         
            fulfillmentText:  result
        });
    }   
    return processWords(sessionId, myWord, saidWord, result, lifespanCount,myContext,res)
     
});
   
    
});

server.listen((process.env.PORT || 8000), () => {
    client.flushall('ASYNC',  function (err, succeeded) {
        console.log("Clearing Redis " + succeeded); // will be true if successfull
    });
    console.log("Cows and bulls Server is up and running...");
});
