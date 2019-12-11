const API_KEY = '8dc8fda3';
//module.exports = API_KEY;

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');

var arrayOf3letterWords = [ "pig","sum","red" ,"spy","kid",'ape','hot',"gas","sit","now" ,'hit','yet',"gym","men","bow","sat","tie",
"saw", 'new','loo','met','shy','run','zoo','fox']
var arrayOf4letterWords = [ 'post',"love",'news',"lick","yelp","glee","glue","mood",'slid','rude','gawk','slow','mind',"lift","jump"]
var client = require('redis').createClient(process.env.REDIS_URL);
//index for the data separated by ##
var seperator = "##"
var iWord = 0
var iAttempt = 1
var iHintsAsked = 2
var iNoCowsBulls = 3
var iAllResponse = 4


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
              fulfillmentText: myWord + " is right. If you want to play again, say the number of letters. You can say Stop to end the game. ",
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
    responseText = saidWord + " has " + bulls + " bulls and " + cows + " cows.";
    //var toBeStored = "";
    if(bulls == 0 && cows == 0)
      {
          //add the data as a group
          if(result.length > 0)
            {
                parsedResult = result.split(seperator);
                
                parsedResult [0] += ", " + saidWord;
                result = parsedResult[0] + seperator + parsedResult[1];
                console.log("result with 0 ", result)
            }
          else //this is the first results
           {
                result = saidWord + seperator + ""
                console.log("first result ", result)
           }
      }
      else
      {
        if(result.length == 0)  
        {
            //strtring new . add space for no cow/bull words
            result = " ## ";
        }
        result =  result + " " + responseText;
          console.log("result ", result)
      }
    
    var toBeStored = myWord + "## " + result;
    client.mset(sessionId,toBeStored); //keep adding to cache for later hint retrieval
    console.log(toBeStored)
    //Add it for Hint retrival
   // client.
    if(lifespanCount == undefined) 
    {
      client.del(sessionId);//reset the word
      responseText += " No more attempts ";
    }
    //else 
     //  responseText += " "; //" You have " + lifespanCount + "attempts";
    return res.json({
              fulfillmentText:   responseText + "Try another word "
          });
}

server.post('/get-cows-and-bulls', (req, res) => {

  //console.log(req.body.queryResult.queryText);
  console.log(req.body.queryResult.outputContexts[0].name);
  console.log(req.body.queryResult.action);
  let action = req.body.queryResult.action;
  //get the context readyState
  let countOfContexts = req.body.queryResult.outputContexts.length;
  let sessionId = req.body.session
  let sayLetterContext  = "sayletter-followup";
  let repeatContext = "repeat";
  var lifespanCount = 0;
  var lengthOfWord = 0;
  var i;
  var supportedContext = false;
  var displayHelp = false;
  var myContext = "";
  //get the information about the context so that it can be used when sending the response.
  for (i = 0; i < countOfContexts; i++) { 
        //console.log(req.body.queryResult.outputContexts[i].name)
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
                console.log(myContext + "  " + repeatContext);
                displayHelp = true;
				break;
        }

        
    }

   
  if(!supportedContext)
      {
        return res.json({
            fulfillmentText:   "Don't know what you are saying. Try again. "
        });
      }


let saidWord = req.body.queryResult.parameters.theword;

if(!displayHelp )
{
    if(saidWord.indexOf("chitra") == 0)
    {
        responseText  = saidWord + " is not a " + lengthOfWord + " letter word. Try again Chitra"  
        //responseText += "<audio  src=\"https://actions.google.com/.../cat_purr_close.ogg\"/>"
     
        return res.json({


            
                "payload": {
                  "google": {
                    "expectUserResponse": true,
                    "richResponse": {
                      "items": [
                        {
                          "simpleResponse": {
                            "ssml": "<speak>Here are <say-as interpret-as=\"characters\">SSML</say-as> samples. I can pause <break time=\"3\" />. I can play a sound <audio src=\"https://actions.google.com/sounds/v1/alarms/winding_alarm_clock.ogg\">your wave file</audio>. I can speak in cardinals. Your position is <say-as interpret-as=\"cardinal\">10</say-as> in line. Or I can speak in ordinals. You are <say-as interpret-as=\"ordinal\">10</say-as> in line. Or I can even speak in digits. Your position in line is <say-as interpret-as=\"digits\">10</say-as>. I can also substitute phrases, like the <sub alias=\"World Wide Web Consortium\">W3C</sub>. Finally, I can speak a paragraph with two sentences. <p><s>This is sentence one.</s><s>This is sentence two.</s></p></speak>",
                            "displayText": "This is a SSML sample. Make sure your sound is enabled to hear the demo"
                          }
                        }
                      ]
                    }
                  }
                }
           
            /*
           // fulfillmentText:  responseText  ,
           "fulfillmentMessages": {
            
            "items": [
              {
                "simpleResponse": {
                  "ssml": "<speak>Here are <say-as interpret-as=\"characters\">SSML</say-as> samples. I can pause <break time=\"3\" />. I can play a sound <audio src=\"https://actions.google.com/sounds/v1/alarms/winding_alarm_clock.ogg\">your wave file</audio>. I can speak in cardinals. Your position is <say-as interpret-as=\"cardinal\">10</say-as> in line. Or I can speak in ordinals. You are <say-as interpret-as=\"ordinal\">10</say-as> in line. Or I can even speak in digits. Your position in line is <say-as interpret-as=\"digits\">10</say-as>. I can also substitute phrases, like the <sub alias=\"World Wide Web Consortium\">W3C</sub>. Finally, I can speak a paragraph with two sentences. <p><s>This is sentence one.</s><s>This is sentence two.</s></p></speak>",
                  "displayText": "This is a SSML sample. Make sure your sound is enabled to hear the demo"
                }
              }
            ]
          }
          
            fulfillmentMessage :
             { 
                 text : responseText  ,    
                 simpleResponses :
                 [
                      {
                        "simpleResponse": {
                            "ssml": "<speak>Here are <say-as interpret-as=\"characters\">SSML</say-as> samples. I can pause <break time=\"3\" />. I can play a sound <audio src=\"https://actions.google.com/sounds/v1/alarms/winding_alarm_clock.ogg\">your wave file</audio>. I can speak in cardinals. Your position is <say-as interpret-as=\"cardinal\">10</say-as> in line. Or I can speak in ordinals. You are <say-as interpret-as=\"ordinal\">10</say-as> in line. Or I can even speak in digits. Your position in line is <say-as interpret-as=\"digits\">10</say-as>. I can also substitute phrases, like the <sub alias=\"World Wide Web Consortium\">W3C</sub>. Finally, I can speak a paragraph with two sentences. <p><s>This is sentence one.</s><s>This is sentence two.</s></p></speak>",
                            "displayText": "This is a SSML sample. Make sure your sound is enabled to hear the demo"
                          }
                      }
                 ]

             }
             */
        });
    }
    if(saidWord.length != lengthOfWord )  
    {
        //maybe the user spelled out the word. 
        var parsedWord = saidWord.split(" ");
        if(parsedWord.length == 3)
        {
            if(parsedWord[0].length == 1 && parsedWord[1].length == 1 && parsedWord[2].length == 1)
            {
                saidWord = parsedWord[0]+parsedWord[1]+parsedWord[2];
            }
        }
        else 
        {
            responseText  = saidWord + " is not a " + lengthOfWord + " letter word. Try again"  
            //responseText += " You have " + lifespanCount + "attempts";          
            return res.json({
                
                fulfillmentText:  responseText         
            });
        }
    }
}
let myWord = "ERR" 
myWord = client.get(sessionId, function (error, result) {
    if (error || (result ==  null)) {
       //word not set yet
       if (displayHelp)  
       {
        return res.json({
         
            fulfillmentText:  " Hint will list all the words your tried guessing so far. You haven't tried any word yet. Start guessing a word now."     
        });
       }   

       // returns a random integer from 0 to 9]
       myWord = "test"
       if(lengthOfWord == 3)
             myWord = arrayOf3letterWords[Math.floor(Math.random() * 20)];   
       if(lengthOfWord == 4)     
            myWord = arrayOf4letterWords[Math.floor(Math.random() * 10)];     
       client.set(sessionId, myWord);
       console.log("My new word is " + myWord);
       result = "";
       
    }
    else
    {
       //result has both the word and all the clues so far separated by ##
       //get just the word . it is separated by ##
      // console.log("From Db" + result);
       
       myWord = result.slice(0, result.indexOf(seperator,0) );
       result =  result.slice(  result.indexOf(seperator,0) + 2 , result.length); 
       console.log("My already set word is " + myWord)
       console.log("saved content " + result);
    }
    if (displayHelp)  
    {
        var parsedText = result.split(seperator);

        if(parsedText.length > 1) //  words with no cows and bulls
        {
            if(parsedText[0].trim().length > 0)
                result = parsedText[0] + " has no cows or bulls. " +  parsedText[1];
            else
                result = parsedText[1];
        }

        return res.json({
         
            fulfillmentText:  "Here are the words you tried so far. " + result + " You can say I give up if you don't want to continue. Otherwise try guessing again. "
        });
    } 
    if(action.indexOf("Giveup") == 0)
    {
       return res.json({
           fulfillmentText:   "Ok. We will end the game now. " +  " The word is " + myWord
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
