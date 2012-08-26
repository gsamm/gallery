(function () {
	var Gallery = {};

	Gallery.IMAGES = 64;
	Gallery.IMAGES_PER_ROW = 8;
	Gallery.TILE_WIDTH = Gallery.TILE_HEIGHT = 75;

	Gallery.Events = _.extend({}, Backbone.Events);

	Gallery.Models = {};
	Gallery.Models.FlickrPhoto = Backbone.Model.extend({});

	Gallery.Collections = {};
	Gallery.Collections.FlickrPhotoCollection = Backbone.Collection.extend({
		model: Gallery.Models.FlickrPhoto,
		url: "http://api.flickr.com/services/rest/?method=flickr.photos.getRecent&api_key=1d562390dd25190883b74f6b83bdd74e&extras=url_sq%2C+url_z&per_page=" + Gallery.IMAGES + "&format=json&nojsoncallback=1",

		parse: function (response) {
			return response.photos.photo;
		}
	});

	Gallery.Views = {};
	Gallery.Views.FlickrPhotoView = Backbone.View.extend({
		tagName: "li",
		template: Handlebars.compile($("#gallery-item-template").html()),

		events: {
			"click .tile": "tileClicked"
		},

		initialize: function () {
			this.row = this.options.row;
			this.col = this.options.col;

			Gallery.Events.on("tile:clicked", this.loadImage, this);
		},

		render: function () {
			$(this.el).html(this.template(this.model.toJSON()));
			return this;
		},

		tileClicked: function (event) {
			// var currentTarget = $(event.currentTarget);
			// currentTarget.toggleClass("flipped");
			Gallery.Events.trigger("tile:clicked", this.model.get("url_z"), this.row, this.col);
		},

		loadImage: function (imageUrl, row, col) {
			var that = this;
			var distanceX = Math.abs(this.col - col);
			var distanceY = Math.abs(this.row - row);
			var delay = 100 * (distanceX + distanceY);

			setTimeout(function () {
				var tileBack = that.$(".back");
				var backgroundPositionX = that.col * Gallery.TILE_WIDTH;
				var backgroundPositionY = that.row * Gallery.TILE_HEIGHT;

				that.$(".tile").toggleClass("flipped");

				if (!that.flipped) {
					tileBack.css("background-image", "url(" + imageUrl + ")");
					tileBack.css("background-position", "-" + backgroundPositionX + "px -" + backgroundPositionY + "px");
					that.flipped = true;
				} else {
					that.flipped = false;
				}
			}, delay);
		}
	});

	Gallery.Views.FlickrPhotoCollectionView = Backbone.View.extend({
		template: Handlebars.compile($("#gallery-template").html()),

		initialize: function () {
			var that = this;

			this.flickrPhotoViews = [];
			this.collection.each(function (flickrPhoto, i) {
				that.flickrPhotoViews.push(new Gallery.Views.FlickrPhotoView({
					model: flickrPhoto,
					row: Math.floor(i / Gallery.IMAGES_PER_ROW),
					col: i % Gallery.IMAGES_PER_ROW
				}));
			});

			this.render();
		},

		render: function () {
			var that = this;

			$(this.el).css("width", Gallery.IMAGES_PER_ROW * Gallery.TILE_WIDTH);

			_(this.flickrPhotoViews).each(function (flickrPhotoView) {
				$(that.el).append(flickrPhotoView.render().el);
			});

			return this;
		}
	});

	$(function () {
		// Fetch the collection of Flickr images.
		var flickrPhotoCollection = new Gallery.Collections.FlickrPhotoCollection();
		flickrPhotoCollection.fetch({
			dataType: "json",
			success: function (collection, response) {
				// Render the main app view and add it to the DOM.
				new Gallery.Views.FlickrPhotoCollectionView({ 
					collection: flickrPhotoCollection,
					el: $("#gallery")
				});
			}
		});
	});
})($);