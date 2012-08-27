(function () {
	var Gallery = {};

	Gallery.IMAGES = 25;
	Gallery.IMAGES_PER_ROW = 5;
	Gallery.TILE_WIDTH = Gallery.TILE_HEIGHT = 75;

	// PubSub object to facilitate global events.
	Gallery.Events = _.extend({}, Backbone.Events);

	Gallery.Models = {};
	Gallery.Models.FlickrPhoto = Backbone.Model.extend({});

	Gallery.Collections = {};
	Gallery.Collections.FlickrPhotoCollection = Backbone.Collection.extend({
		model: Gallery.Models.FlickrPhoto,
		url: "http://api.flickr.com/services/rest/?method=flickr.photos.getRecent&api_key=1d562390dd25190883b74f6b83bdd74e&extras=url_sq%2C+url_n&per_page=" + Gallery.IMAGES + "&format=json&nojsoncallback=1",

		parse: function (response) {
			return response.photos.photo;
		}
	});

	Gallery.Views = {};
	
	Gallery.Views.SpinnerView = {
		show: function () {
			$("#spinner").css("display", "block");
		},

		hide: function () {
			$("#spinner").css("display", "none");
		}
	};

	Gallery.Views.FlickrPhotoView = Backbone.View.extend({
		tagName: "li",
		template: $("#gallery-item-template").html(),

		events: {
			"click .tile": "tileClicked",
			"mouseenter .front": "fadeIn",
			"mouseleave .front": "fadeOut"
		},

		initialize: function () {
			this.row = this.options.row;
			this.col = this.options.col;

			Gallery.Events.on("tile:flipToFront", this.flipToFront, this);
			Gallery.Events.on("tile:flipToBack", this.flipToBack, this);
		},

		render: function () {
			var img = $("<img />").attr("src", this.model.get("url_sq")).load(function () {
				Gallery.Events.trigger("image:loaded");
			});

			$(this.el).html(this.template);
			$(this.el).find(".front").append(img);

			return this;
		},

		tileClicked: function (event) {
			if (this.flipped) {
				Gallery.Events.trigger("tile:flipToFront", this.row, this.col);
			} else {
				var that = this;
				var imageUrl = this.model.get("url_n");

				console.log("Started downloading: " + imageUrl);
				Gallery.Views.SpinnerView.show();
				$("<img />").attr("src", imageUrl).load(function () {
					console.log("Finished downloading: " + imageUrl);
					Gallery.Views.SpinnerView.hide();
					Gallery.Events.trigger("tile:flipToBack", imageUrl, that.row, that.col);
				});
			}
		},

		flip: function (row, col) {
			var that = this;
			var distanceX = Math.abs(this.col - col);
			var distanceY = Math.abs(this.row - row);
			var delay = 100 * (distanceX + distanceY);

			setTimeout(function () {
				that.$(".tile").toggleClass("flipped");
				that.flipped = !that.flipped;
			}, delay);
		},

		flipToFront: function (row, col) {
			this.flip(row, col);
		},

		flipToBack: function (imageUrl, row, col) {
			var tileBack = this.$(".back");
			var backgroundPositionX = this.col * Gallery.TILE_WIDTH;
			var backgroundPositionY = this.row * Gallery.TILE_HEIGHT;

			tileBack.css("background-image", "url(" + imageUrl + ")");
			tileBack.css("background-position", "-" + backgroundPositionX + "px -" + backgroundPositionY + "px");
			
			this.flip(row, col);
		},

		fadeIn: function (event) {
			this.$(".front").stop().animate({ opacity: "1" }, 500);
		},

		fadeOut: function (event) {
			this.$(".front").stop().animate({ opacity: "0.5" }, 500);
		}
	});

	Gallery.Views.FlickrPhotoCollectionView = Backbone.View.extend({
		template: Handlebars.compile($("#gallery-template").html()),

		initialize: function () {
			var that = this;

			this.imagesLoaded = 0;
			this.flickrPhotoViews = [];
			this.flickrPhotoReflectionViews = [];

			this.collection.each(function (flickrPhoto, i) {
				that.flickrPhotoViews.push(new Gallery.Views.FlickrPhotoView({
					model: flickrPhoto,
					row: Math.floor(i / Gallery.IMAGES_PER_ROW),
					col: i % Gallery.IMAGES_PER_ROW
				}));
			});

			var lastRowIndex = (Gallery.IMAGES / Gallery.IMAGES_PER_ROW - 1) * Gallery.IMAGES_PER_ROW;

			for (var i = lastRowIndex; i < Gallery.IMAGES; i++) {
				this.flickrPhotoReflectionViews.push(new Gallery.Views.FlickrPhotoView({
					model: this.collection.at(i),
					row: Math.floor(i / Gallery.IMAGES_PER_ROW),
					col: i % Gallery.IMAGES_PER_ROW
				}));
			};

			Gallery.Events.on("image:loaded", this.imageLoaded, this);

			this.render();
		},

		render: function () {
			var that = this;

			$(this.el).css("width", Gallery.IMAGES_PER_ROW * Gallery.TILE_WIDTH);

			_(this.flickrPhotoViews).each(function (flickrPhotoView) {
				$(that.el).append(flickrPhotoView.render().el);
			});

			_(this.flickrPhotoReflectionViews).each(function (flickrPhotoView) {
				$("#reflections").append(flickrPhotoView.render().el);
			});

			return this;
		},

		imageLoaded: function () {
			this.imagesLoaded += 1;
			console.log("Images loaded:" + this.imagesLoaded);

			if (this.imagesLoaded === Gallery.IMAGES) {
				console.log("All images loaded.");
				Gallery.Views.SpinnerView.hide();
				this.show();
			}
		},

		show: function () {
			this.$el.animate({
				opacity: 1
			}, 1000)
		}
	});

	$(function () {
		var flickrPhotoCollection = new Gallery.Collections.FlickrPhotoCollection();

		Gallery.Views.SpinnerView.show();
		flickrPhotoCollection.fetch({
			dataType: "json",
			success: function (collection, response) {
				new Gallery.Views.FlickrPhotoCollectionView({ 
					collection: flickrPhotoCollection,
					el: $("#gallery")
				});
			}
		});
	});
})($);