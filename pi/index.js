var AWS = require("aws-sdk");
var awsIot = require('aws-iot-device-sdk');
var gpio = require('rpi-gpio');
var fs = require("fs");
var Raspistill = require('node-raspistill').Raspistill;

SetupGPIO();

AWS.config.loadFromPath("./config.json");

var s3 = new AWS.S3();

var myBucket = "<Your Bucket Name>";                                                      // *********************** Change **********************
var myKey = "demo.jpg";
var photoPath = "./photos/image.jpg";

var thingName = "<Your Thing Name>";                                                      // *********************** Change **********************
var keypath = "./certs/<Your Certifcate Number>-private.pem.key";                         // *********************** Change **********************
var certPath = "./certs/<Your Certifcate Number>-certificate.pem.crt";                    // *********************** Change **********************
var caPath = "./certs/VeriSign-Class 3-Public-Primary-Certification-Authority-G5.pem";
var clientId = thingName;
var region = "eu-west-1";
var host = "<Your Thing HTTP Rest Endpoint>";                                             // *********************** Change **********************

var connectionParamaters = {
    keyPath: keypath,
    certPath: certPath,
    caPath: caPath,
    clientId: clientId,
    region: region,
    host: host
  };
  
  //Add your certificates and region details in the file system
  var device = awsIot.device(connectionParamaters);
  
  //Initializing Shadow State
  var requestedState = {
    "state": {
          "reported": {
            "device": "Lamp",
            "state": "Off",
          }
        }
  }

 //Connecting and subscribing to Shadow Topics
device
.on('connect', function() {
  console.log('Connected to AWS IoT' );
  console.log(JSON.stringify(device));
  device.subscribe('$aws/things/' + thingName + '/shadow/#');
  device.subscribe('$aws/things/' + thingName + '/#');
  device.subscribe('localstatus');
  device.publish('localstatus', 'Pi connected!');
  device.publish('$aws/things/' + thingName + '/shadow/update', JSON.stringify(requestedState));
  });

    //Listening for updates
device
.on('message', function(topic, payload) {
  console.log('message', topic, payload.toString(),'\n');
  //In case there's an IoT Remote app controlling and it sent a msg to 'localstatus', let it know it is alive
  if (topic == "localstatus" && payload.toString() == "Pi connected!"){
    device.publish('localstatus', 'Pi says hello to '  + thingName +  '!');
  }
  if (topic == "$aws/things/" + thingName + "/shadow/update/accepted"){
    requestedState = JSON.parse(payload.toString());
    console.log('Waiting for command from the mothership <Endpoint>.iot.<region>.amazonaws.com\n')
    handleRequest(requestedState);
  }
});

//Receiving commands
function handleRequest(requestedState){
  console.log ("Passing on Request to Pi: " + JSON.stringify(requestedState));

  //
  // Control a Lamp
  //
  if(requestedState.state.reported.device == "Lamp")
  {
    if (requestedState.state.reported.state == 'On')
    {
      gpio.write(37, true, function(err) {
        if (err) throw err;
        console.log('Written to pin');
      });

      gpio.write(32, false, function(err) {
        if (err) throw err;
        console.log('Written to pin');
      });

      console.log('Turning the Light off\n');
    } 
    else
    {
      gpio.write(37, false, function(err) {
        if (err) throw err;
        console.log('Written to pin');
      });

      gpio.write(32, true, function(err) {
        if (err) throw err;
        console.log('Written to pin');
      });

      console.log('Turning the Light on\n');
    }
      
  };

    //
  // Control a Television
  //
  if(requestedState.state.reported.device == "Television")
  {
    if (requestedState.state.reported.state == 'On')
    {
      gpio.write(36, false, function(err) {
        if (err) throw err;
        console.log('Written to pin');
      });

      console.log('Turning the Television off\n');
    } 
    else
    {
      gpio.write(36, true, function(err) {
        if (err) throw err;
        console.log('Written to pin');
      });

      console.log('Turning the Television on\n');
    }
      
  };
  
}

function SetupGPIO()
{
  gpio.setup(37, gpio.DIR_OUT, function() {
    
  }); 
  
  gpio.setup(32, gpio.DIR_HIGH, function() {
    
  }); 

  gpio.setup(36, gpio.DIR_HIGH, function() {
    
  }); 

  gpio.setup(38, gpio.DIR_HIGH, function() {
    
  }); 

  gpio.setup(40, gpio.DIR_HIGH, function() {
    
  }); 

  gpio.on('change', function(channel, value) {
    takePhoto();
    console.log('Channel ' + channel + ' value is now ' + value);
  });
  gpio.setup(3, gpio.DIR_IN, gpio.EDGE_RISING);
  
}

function takePhoto() {  

  const piStillCamera = new Raspistill({
      fileName: photoPath,
      verticalFlip: true,
      width: 800,
      height: 600
  });

  piStillCamera.takePhoto('image')
  .then((photo) => {
      console.log('took first photo', photo);
      analysePhoto();    
  })
  .catch((error) => {
      console.error('something bad happened', error);
  });   

};

function analysePhoto() {

fs.readFile(photoPath, function(err, data) {
  if (err) {
    throw err;
  }

  params = { Bucket: myBucket, Key: myKey, Body: data };

  try {
    s3.deleteObject(myKey);
  } catch (ex) {
    console.log(ex);
  }

  s3.putObject(params, function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log("Successfully uploaded data to myBucket/myKey");

      var params = {
        Attributes: ["ALL"],
        Image: {
          S3Object: {
            Bucket: myBucket,
            Name: myKey
          }
        }
      };        
    }
  });
});
};
