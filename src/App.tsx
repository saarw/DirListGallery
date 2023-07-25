import React, { useEffect, useState } from 'react';
import { Route } from 'react-router-dom';
import './App.css';

function parseFileListing(page: string): Array<string> {
  const images: Array<string> = [];
  const lcPage = page.toLowerCase();
  let n = -1;
  // Find images in quotes, "imagename.jpg"
  while ((n = lcPage.indexOf('.jpg"', n+1)) >= 0) {
    let before = Math.max(page.lastIndexOf('"', n), page.lastIndexOf('/', n));
    let image = page.substring(before + 1, n + '.jpg'.length);
    images.push(image);
  }
  
  return images;
}

function Gallery(props: {
  galleryPath?: string;
}) {
  const [images, setImages] = useState<Array<string>>();
  let pagePath = window.location.pathname;
  // router paths always start with / so get rid of ending slash at page path
  pagePath = pagePath.endsWith('/') ? pagePath.substring(0, pagePath.length - 1) : pagePath;
  useEffect(() => {
    if (props.galleryPath) {
      setImages(undefined);
      fetch(pagePath + props.galleryPath)
        .then((rsp) => {
          if (rsp.status == 200) {
            rsp.text().then(text => {
              var images = parseFileListing(text);
              if (props.galleryPath == null) throw Error("Path expected");
              const dirPath = pagePath + (props.galleryPath.endsWith('/') ? props.galleryPath : props.galleryPath + '/');
              setImages(images.map(imgName => {
                return dirPath + imgName;
              }));
            })
            .catch((err) => {
              console.log('Error reading page content', err);
              setImages([]);
            })
          } else {
            console.log('Error fetch response: ' + rsp.status + ' ' + rsp.statusText);
          }
        })
        .catch((err) => {
          console.log('Error fetching page', err);
          setImages([]);
        });
    } else {
      setImages([]);
    }
  }, [props.galleryPath]);
  return <div className="Gallery-main">
    {images == null ? 'Loading...' : images.map((imagePath) => <img key={imagePath} className="Gallery-image" src={imagePath}></img>)}
  </div>;
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
      </header>
      <div className="App-body">
      <Route render={(props) => <Gallery galleryPath={props.location.pathname}></Gallery>}>
      </Route>
      </div>
    </div>
  );
}

export default App;
