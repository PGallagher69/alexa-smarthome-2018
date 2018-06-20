var AWS = require("aws-sdk");
var awsIot = require('aws-iot-device-sdk');
var gpio = require('rpi-gpio');

SetupGPIO();

AWS.config.loadFromPath("./config.json");

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
  
}