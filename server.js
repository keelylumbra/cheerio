/* Showing Mongoose's "Populated" Method (18.3.8)
 * INSTRUCTOR ONLY
 * =============================================== */

// dependencies
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
// Notice: Our scraping tools are prepared, too
var request = require('request'); 
var cheerio = require('cheerio');

// use morgan and bodyparser with our app
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
  extended: false
}));

// make public a static dir
app.use(express.static('public'));


// Database configuration
var mongojs = require('mongojs');
var databaseUrl = "scraper";
var collections = ["scrapedData"];

// Hook mongojs configuration to the db variable
var db = mongojs(databaseUrl, collections);
db.on('error', function(err) {
  console.log('Database Error:', err);
});


// once logged in to the db through mongoose, log a success message
db.once('open', function() {
  console.log('Mongoose connection successful.');
});


// And we bring in our Note and Article models
var Note = require('./models/Note.js');
var Article = require('./models/Article.js');


// Routes
// ======

// Simple index route
app.get('/', function(req, res) {
  res.send(index.html);
});

// A GET request to scrape the echojs website.
app.get('/scrape', function(req, res) {
 // make a request for the news section of ycombinator
  request('https://news.ycombinator.com/', function(error, response, html) {
    // load the html body from request into cheerio
    var $ = cheerio.load(html);
    // for each element with a "title" class
    $('.title').each(function(i, element) {
      // save the text of each link enclosed in the current element
      var title = $(this).children('a').text();
      // save the href value of each link enclosed in the current element
      var link = $(this).children('a').attr('href');

      // if this title element had both a title and a link
      if (title && link) {
        // save the data in the scrapedData db
        db.scrapedData.save({
          title: title,
          link: link
        }, 
        function(err, saved) {
          // if there's an error during this query
          if (err) {
            // log the error
            console.log(err);
          } 
          // otherwise, 
          else {
            // log the saved data
            console.log(saved);
          }
        });
      }
    });
  });

  // this will send a "search complete" message to the browser
  res.send("Scrape Complete");
});

// this will get the articles we scraped from the mongoDB
app.get('/articles', function(req, res){
  db.scrapedData.find({}, function(err, found) {
    // throw any errors to the console
    if (err) {
      console.log(err);
    } 
    // if there are no errors, send the data to the browser as a json
    else {
      res.json(found);
  }
})
});

// grab an article by it's ObjectId
app.get('/articles/:id', function(req, res){
	// using the id passed in the id parameter, 
	// prepare a query that finds the matching one in our db...
	Article.findOne({'_id': req.params.id})
	// and populate all of the notes associated with it.
	.populate('note')
	// now, execute our query
	.exec(function(err, doc){
		// log any errors
		if (err){
			console.log(err);
		} 
		// otherwise, send the doc to the browser as a json object
		else {
			res.json(doc);
		}
	});
});


// replace the existing note of an article with a new one
// or if no note exists for an article, make the posted note it's note.
app.post('/articles/:id', function(req, res){
	// create a new note and pass the req.body to the entry.
	var newNote = new Note(req.body);

	// and save the new note the db
	newNote.save(function(err, doc){
		// log any errors
		if(err){
			console.log(err);
		} 
		// otherwise
		else {
			// using the Article id passed in the id parameter of our url, 
			// prepare a query that finds the matching Article in our db
			// and update it to make it's lone note the one we just saved
			Article.findOneAndUpdate({'_id': req.params.id}, {'note':doc._id})
			// execute the above query
			.exec(function(err, doc){
				// log any errors
				if (err){
					console.log(err);
				} else {
					// or send the document to the browser
					res.send(doc);
				}
			});
		}
	});
});







// listen on port 3000
app.listen(3000, function() {
  console.log('App running on port 3000!');
});
