$(document).ready(function() {
		
	     // declare a few constants:
	     var SMALL = 16; //small font size in pixels
	     var LARGE = 20; //larger size in pixels
	     var COOKIE_NAME = "Simple-Fontresizer"; //Maybe give this the name of your site.

	     //make it small by default
	     var fontsize = SMALL; 

	     // Only show text resizing links if JS is enabled
	     $(".fontresize").show();

	     // if cookie exists set font size to saved value, otherwise create cookie
	     if($.cookie(COOKIE_NAME)) {
		     fontsize = $.cookie(COOKIE_NAME);
		     //set initial font size for this page view:
		     $("body").css("font-size", fontsize + "px");
		     //set up appropriate class on font resize link:
		     if(fontsize == SMALL) { $("#textSmaller").addClass("current"); }
		     else { $("#textLarger").addClass("current"); }
	     } else {
		     $("#textSmaller").addClass("current");
		     $.cookie(COOKIE_NAME, fontsize);
	     }

	     // large font-size link:
	     $("#textLarger").bind("click", function() {
			     if(fontsize == SMALL) {
			     fontsize = LARGE;
			     $("body").css("font-size", fontsize + "px");
			     $("#textLarger").toggleClass("current");
			     $("#textSmaller").toggleClass("current");
			     $.cookie(COOKIE_NAME, fontsize);
			     }
			     return false;	
			     });
	     
	     // small font-size link:
	     $("#textSmaller").bind("click", function() {
			     if(fontsize == LARGE) {
			     fontsize = SMALL;
			     $("body").css("font-size", fontsize + "px");
			     $("#textLarger").toggleClass("current");
			     $("#textSmaller").toggleClass("current");
			     $.cookie(COOKIE_NAME, fontsize);
			     }
			     return false;	
			     });
});
