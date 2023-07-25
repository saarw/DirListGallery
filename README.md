# DirListGallery
Share image galleries from your own website as easily as using cloud services like Google Drive or Dropbox. Copy DirListGallery to any website that supports directory listings and you can share image galleries by uploading them to subdirectories on the site.

Assume you have a website with image galleries like   
```/gallery1```   
```/gallery2```   

1. Copy the files in the ```build``` directory into the root of the website, or into the directory above your galleries if they are not at the root.
3. You can now share links to the galleries with a path like ```/#/gallery1```. If your galleries are in a subdirectory, say ```/galleries/gallery1```, you should copy DirListGallery to the ```/galleries``` directory and the links will look like ```/galleries/#/gallery1```

You can now quickly share a new gallery of photos by uploading the images to a new subdirectory (```my_new_gallery```) and sharing the link with ```/#/my_new_gallery```

### Privacy
The galleries do not have other protection than that they can be hard to find. The gallery page in the directory above the galleries prevents listing of subdirectories, so visitors should only be able to find your galleries if they know the link with the gallery name after #/. There are programs that can test many different subdirectory links, so you can increase the privacy of your galleries by giving them long and hard to guess names (same rules as for passwords). 

To prevent search engines from indexing your galleries if they come across the links, you can add the path to where you uploaded the DirListGallery page to a robots.txt file at the root of your site (note, don't add the paths to your galleries, as people can then find them by reading the robots.txt file). Example robots.txt file:    
```
# https://www.robotstxt.org/robotstxt.html
User-agent: *
Disallow: /galleries/
```

## How it works and how to customize
The gallery is an app based on React and React Router. The app fetches the directory listings of gallery subdirectories below the app page path, specified by the hash-component of the path, and displays all images ending with ```.jpg```.

### Customize
Clone the repo and run ```npm install```in the root.

Modify the code and run ```npm run build``` in the root to rebuild the gallery in the build directory.


