
Parse.Cloud.define('hello', function(req, res) {
  res.success('Hi');
});

Parse.Cloud.afterSave("CheckIn", function(request) {
  console.log('afterSave begin');	
  var checkInUser = request.object.get('checkInUser');
  var checkInCourt = request.object.get('checkInCourt');
	
	checkInUser.fetch().then(function(user) {
		return checkInCourt.fetch().then(function(court) {
			var username = user.get('username');
			
			var courtName = court.get('name');
			
			var timeString = request.object.get('checkInTimeString');

			var message = username+" is going to "+courtName+" on "+timeString;

			var followingQuery = new Parse.Query("Follow");
			followingQuery.equalTo("fromUser", checkInUser);

			var followersQuery = new Parse.Query("Follow");
			followersQuery.equalTo("toUser", checkInUser);
			followersQuery.matchesKeyInQuery("fromUser","toUser",followingQuery);

			var pushQuery = new Parse.Query(Parse.Installation);
			pushQuery.matchesKeyInQuery("user","fromUser",followersQuery);

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

	});
  
  
});

Parse.Cloud.afterSave("Activity", function(request) {
	console.log('Activity aftersave');
	var activityType = request.object.get('type');
	
	var location = request.object.get("location");
	var toUser = request.object.get("toUser");
	var fromUser = request.object.get("fromUser");

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
	else if(activityType == "Video") {
		console.log("Video ActivityType");
		if(toUser.id != fromUser.id) {
			console.log("users not equal");
			toUser.fetch.then(function(toUser) {
				console.log("fetched toUser");
				return fromUser.fetch().then(function(fromUser) {
					console.log("fetched fromUser");
					var toUsername = toUser.get("username");
					var fromUsername = fromUser.get("username");
					var message = fromUsername+" has tagged you in a video!"
					console.log(message);
					var pushQuery = new Parse.Query(Parse.Installation);
					pushQuery.equalTo("user",toUser)

					Parse.Push.send({
		  				where: pushQuery,
			  			data: {
			    			alert: message
			  			}
		   			}, { useMasterKey: true }).then(function() {
			    		// Push was successful
						console.log('Tagged Push Success!!!');
		  			}, function(error) {
						console.log('Push Error');
			    		throw "Got an error " + error.code + " : " + error.message;
		  			});
				});
			}, function(error) {
				console.log("Error Pushing after activity");
			});
		}
	}
	
});

Parse.Cloud.afterDelete(Parse.User, function(request) {
	console.log("Deleting user"+request.object.id);
	var activityQuery = new Parse.Query("Activity");
	activityQuery.equalTo("fromUser", request.object);
	activityQuery.find({useMasterKey: true}).then(function(activityResults) {
		console.log("Activities found:"+activityResults.length);
		return Parse.Object.destroyAll(activityResults, {useMasterKey: true});
		
	}).then(function() {
		console.log("Activities deleted");
		var taggedActivitiesQuery = new Parse.Query("Activity");
		taggedActivitiesQuery.equalTo("toUser",request.object);
		return taggedActivitiesQuery.find({useMasterKey: true});
	}).then(function(taggedResults) {
		console.log("taggedResults");
		return Parse.Object.destroyAll(taggedResults,{useMasterKey: true});
	}).then(function() {
		console.log("Tagged Activities Deleted:"+request.object.id);
		var followerQuery = new Parse.Query("Follow");
		followerQuery.equalTo("fromUser",request.object);
		return followerQuery.find({useMasterKey: true});
	}).then(function(followerResults) {
		console.log("follower results");
		return Parse.Object.destroyAll(followerResults, {useMasterKey: true});
	}).then(function() {
		console.log("followers deleted");
		var followingQuery = new Parse.Query("Follow");
		followingQuery.equalTo("toUser", request.object);
		return followingQuery.find({useMasterKey: true});
	}).then(function(followingResults) {
		console.log("following results");
		return Parse.Object.destroyAll(followingResults, {useMasterKey: true});
	}).then(function(){
		console.log("following deleted");
		var leaderboardQuery = new Parse.Query("Leaderboard");
		leaderboardQuery.equalTo("user",request.object);
		return leaderboardQuery.find({useMasterKey: true});
	}).then(function(leaderboardResults) {
		console.log("leaderboard results");
		return Parse.Object.destroyAll(leaderboardResults, {useMasterKey: true});
	}).then(function() {
		console.log("leaderboard deleted");
		var checkinQuery = new Parse.Query("CheckIn");
		checkinQuery.equalTo("checkInUser",request.object);
		return checkinQuery.find({useMasterKey: true});
	}).then(function(checkinResults) {
		console.log("checkins found");
		return Parse.Object.destroyAll(checkinResults, {useMasterKey: true});
	},function(error) {
		console.log("Error deleting user "+error.message);
	});

});
