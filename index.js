const API_KEY = '8dc8fda3';
//module.exports = API_KEY;

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');


const server = express();
server.use(bodyParser.urlencoded({
    extended: true
}));

server.use(bodyParser.json());



server.post('/get-cows-and-bulls', (req, res) => {

  //console.log(req.body.queryResult.queryText);
  console.log(req.body.queryResult.outputContexts[0].name);
  
  //get the context readyState
  let countOfContexts = req.body.queryResult.outputContexts.length;
  let myContext  = "sayletter-followup";
  var lifespanCount = 0;
  var lengthOfWord = 0;
  var i;
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
  let myWord = "pig";
  if(myWord.indexOf(saidWord) == 0)
	 return res.json({
            //speech: 'Something went wrong!!!',
           // displayText: 'Something went wrong!',
            //source: 'get-cows-and-bulls',
			fulfillmentText: myWord + " is right. If you want to play again, say the number of letters ",
			"outputContexts": [
			{
			  "name": myContext,
			  "lifespanCount": 0 //end game.
			   
			}
		  ]
			 
					
			
        });  
  var responseText =  saidWord + " is Wrong"
  if(saidWord.length != lengthOfWord) 
  {
	  responseText = saidWord + " is not a " + lengthOfWord + " word. Try again. You have " + lifespanCount + "attempts";
	 
  }
  else
  {
	   //calculate cows and bulls.
	   
  }
  
  return res.json({
            //speech: 'Something went wrong!!!',
           // displayText: 'Something went wrong!',
            //source: 'get-cows-and-bulls',
			fulfillmentText:   responseText
			 
		 
			
        });
    
    const movieToSearch = req.body.result && req.body.result.parameters && req.body.result.parameters.movie ? req.body.result.parameters.movie : 'The Godfather';
    const reqUrl = encodeURI(`http://www.omdbapi.com/?t=${movieToSearch}&apikey=${API_KEY}`);
    console.log(movieToSearch);
    console.log(reqUrl);
    http.get(reqUrl, (responseFromAPI) => {
        let completeResponse = '';
        responseFromAPI.on('data', (chunk) => {
            completeResponse += chunk;
        });
        responseFromAPI.on('end', () => {
            const movie = JSON.parse(completeResponse);
            let dataToSend = movieToSearch === 'The Godfather' ? `I don't have the required info on that. Here's some info on 'The Godfather' instead.\n` : '';
            dataToSend += `${movie.Title} is a ${movie.Actors} starer ${movie.Genre} movie, released in ${movie.Year}. It was directed by ${movie.Director}`;

            return res.json({
                speech: dataToSend,
                displayText: dataToSend,
                source: 'get-cows-and-bulls',
				fulfillmentText : "Thats right"
            });
        });
    }, (error) => {
        return res.json({
            speech: 'Something went wrong!!!',
            displayText: 'Something went wrong!',
            source: 'get-cows-and-bulls',
			fulfillmentText: "Wrong"
			
        });
    });
});

server.listen((process.env.PORT || 8000), () => {
    console.log("Cows and bulls Server is up and running...");
});
