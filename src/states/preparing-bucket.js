var Q = require('q'),
	_ = require('lodash');

module.exports = function(config, args) {

	var l  		= config.services.log,
		s3 		= new config.services.AWS.S3(),
		region  = config.region;

	function listBuckets() {
		return Q.ninvoke(s3, "listBuckets", {});
	}

	function createBucket(bucket, region) {
		l.info("Creating bucket %s in region %s.", bucket, region);

		return Q.ninvoke(s3, "createBucket", {
			Bucket 	: bucket,
			ACL 	: 'private',
			CreateBucketConfiguration : {
				LocationConstraint : region
			}
		}).then(function(result) {
			l.success("Created bucket %s in region %s.", bucket, region);
			return waitForBucket(bucket);
		});
	}
	
	function waitForBucket(bucket) {
		l.info("Waiting for bucket %s to be ready.", bucket);
		return Q.ninvoke(s3, "waitFor", "bucketExists", {
			Bucket : bucket
		}).then(function(result) {
			l.info("Bucket %s is ready.", bucket);
			return result;
		});		
	}

	return function(fsm, data) {
		listBuckets()
			.then(function(result) {
				if (_.any(result.Buckets, { Name : data.bucket })) {
					l.info("Using existing bucket %s.", data.bucket);
					return waitForBucket(data.bucket);
				} else {
					return createBucket(data.bucket, region);
				}
			})
			.then(function() {
				fsm.doAction("next", data);
			})
			.fail(function(err) {
				// TODO: ROLLBACK
			});
	}
}