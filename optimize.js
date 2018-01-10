
const { exec } = require('child_process');
const svgoConfig = require('./config.json');
const componentNames = require('./components.json').componentNames;

const fs = require('fs'),
  path = require('path'),
  SVGO = require('svgo'),
  svgo = new SVGO(svgoConfig);
const READ_DIR = 'svgs_to_optimize';
const WRITE_DIR = 'optimized_react_components';

const files = fs.readdirSync(READ_DIR);

/**
 *  takes a file, opens it and passes it to svgo optimize
 *  the callback for this then calls svgtoreact from cli
 * 
 * 
 *   some text areo convert to font 
 */
const optimize = f => {
  //const fullFilePath = `${__dirname}/${READ_DIR}/${f}`;
  const fullFilePath = path.resolve(__dirname,READ_DIR,f);
  fs.readFile(fullFilePath, 'utf8', function(err, data) {
    if (err) {
      throw err;
    }
   
    const filename = `${f.substring(
      0,
      f.indexOf('.svg')
    )}-a`;
    const tempFileName = `${filename}.svg`;
    const intermediateFilePath = path.resolve(__dirname,READ_DIR,tempFileName);
    
  
    //svgo.optimize(data,info,callSVGToReact(fullFilePath));

    svgo.optimize(data,{path:fullFilePath}).then(
      function (result) {
        
        fs.writeFile(intermediateFilePath, result.data, function(err) {
          if (err) {
            return console.log(err);
          }
          // console.log(result);
          // svg-to-react cli
          const componentName = `${filename.substring(
            filename.lastIndexOf('/') + 1,
            filename.indexOf('-a')
          )}`;
          
          const command = `svgtoreact ${READ_DIR}/${filename.substring(
            filename.lastIndexOf('/') + 1
          )} ${componentName}`;
          //console.log(command);
          exec(command, cleanup(componentName, intermediateFilePath));
          
        });
      }
    );
   // console.log(fullFilePath);
  });
};

/**
 *  takes a component's name and filepath and moves it to the output
 *  folder as well as deleting the intermediate file created by the first step
 */
const cleanup = (componentName, intermediateFilePath) => (
  err,
  stdout,
  stderr
) => {
  if (err) {
    // node couldn't execute the command
    console.log(err);
    return;
  }

  if (stdout.includes('ENOENT')) console.log(`svgtoreact: ${stdout}`);
  if (stderr) console.log(`svgtoreact: ${stderr}`);
  else {
    // no error
    // move optimized file
    fs.rename(
      `${componentName}.js`,
      `${WRITE_DIR}/${componentName}.js`,
      () => {}
    );

  }
  
  // delete intermediary *-a.svg file
  fs.unlinkSync(intermediateFilePath);
  //fix for some error
  uppercaseComponent(`${componentName}.js`);
  console.log('DONE! Check optimized_react_components');
};

/**
 *  takes a filename, opens it from the WRITE_DIR and parses the svg tags 
 *  to their uppercase react counterparts, then adds the include statement
 */

const uppercaseComponent = f => {
  const fullFilePath = `${__dirname}/${WRITE_DIR}/${f}`;
  fs.readFile(fullFilePath, 'utf8', function(err, data) {
    if (err) {
      throw err;
    }
 
    let used = [];

    let modified = componentNames.reduce((data, componentToMatch) => {
      if (data.indexOf(`<${componentToMatch.firstLowerCase()}`) >= 0) {
        used.push(componentToMatch);
        return data
          .replace(
            new RegExp(`<${componentToMatch.firstLowerCase()}`, 'g'),
            `<${componentToMatch}`
          )
          .replace(
            new RegExp(`</${componentToMatch.firstLowerCase()}`, 'g'),
            `</${componentToMatch}`
          );
      }
      return data;
    }, data);

    modified = used.length
      ? `import { ${used.join(', ')} } from 'react-native-svg';\n${modified}`
      : modified;

    fs.writeFileSync(fullFilePath, modified);
  });
};


String.prototype.firstLowerCase = function(){
  return this.replace(/^[a-zA-Z]{0,2}/,(s)=>{
    return s.toLowerCase();
  });
}

files.map(optimize); // optimize/convert
