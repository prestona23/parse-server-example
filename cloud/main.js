
Parse.Cloud.define('hello', function(req, res) {
  res.success('Hi');
});

Parse.Cloud.afterSave("CheckIn", function(request) {
  console.log('afterSave begin');	
  var checkInUser = request.object.get('checkInUser');
  var checkInCourt = request.object.get('checkInCourt');

  checkInUser.fetch().then(function(user){
	return checkInCourt.fetch().then(function(court){
	  var username = user.get('username');
	  console.log(username)
	  var courtName = court.get('name');
	  console.log(courtName)
	
	  var followerQuery = new Parse.Query("Follow");
	  followerQuery.select('fromUser');
	  followerQuery.equalTo('toUser',checkInUser);
	  console.log('after follow query')
	  var pushQuery = new Parse.Query(Parse.Installation);
	  pushQuery.matchesKeyInQuery('user','fromUser', followerQuery);
	  var str = request.object.get('checkInTimeString')
	  console.log(str)
	  console.log('after installation query')
	  //var message = username.concat(' is going to ', courtname, ' at ', str)
	  var message = username.concat(" is going to ",courtName, " at ",str)
	  console.log(message)
		
		Parse.Push.send({
		  where: pushQuery,
			  data: {
			    alert: message
			  }
		  }, { useMasterKey: true }).then(function() {
			    // Push was successful
				console.log('Push Success!!!');
		  }, function(error) {
				console.log('Push Error');
			    throw "Got an error " + error.code + " : " + error.message;
		  });
    });
  }, function(error) {
	console.log("error in CheckIn afterSave:"+error.message+":")
  });
  
  console.log('afterSave end');
  
});

Parse.Cloud.afterSave("Activity", function(request) {
	console.log('Activity aftersave');
	var activityType = request.object.get('type');
	
	var location = request.object.get("location");
	var toUser = request.object.get("toUser");
	
	if(activityType == "Like") {
		var leaderboardQuery = new Parse.Query("Leaderboard");
		leaderboardQuery.equalTo("court",location);
		leaderboardQuery.equalTo("user",toUser);
		leaderboardQuery.find().then(function(results) {
			
			if (results.length > 0) {
				var leaderboardObject = results[0];
				leaderboardObject.increment('score');
				return leaderboardObject.save();
			}
			else {
				//Realistically this shouldn't happen because you should be tagged by a checked in user.
				var Leaderboard = Parse.Object.extend("Leaderboard");
				var object = new Leaderboard();
				object.set("user", toUser);
				object.set("court", location);
				object.set("score", 1);
				return object.save();

			}
		}, function(error){
			console.log("Error updating leaderboard");
		});
		
		
	}
	
});
