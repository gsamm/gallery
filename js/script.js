(function () {
	// Namespaces
	var Gallery = {
		Models: {},
		Collections: {},
		Views: {},

		// Constants
		IMAGES: 36,
		IMAGES_PER_ROW: 6,
		TILE_WIDTH: 51,
		TILE_HEIGHT: 51,
	};

	// Facilitate global events.
	_.extend(Gallery, Backbone.Events);

	// Models
	Gallery.Models.Photo = Backbone.Model.extend({});

	// Collections
	Gallery.Collections.PhotoCollection = Backbone.Collection.extend({
		model: Gallery.Models.Photo,
		// url: "http://api.flickr.com/services/rest/?method=flickr.photos.getRecent&api_key=1d562390dd25190883b74f6b83bdd74e&extras=url_sq%2C+url_n&per_page=" + Gallery.IMAGES + "&format=json&nojsoncallback=1",
		url: 'https://api.instagram.com/v1/media/popular?client_id=f16cbf170e71470583ae9bec19f97ab3&count=' + Gallery.IMAGES,

		parse: function (response) {
			return response.data;
		}
	});

	// Views
	Gallery.Views.SpinnerView = {
		show: function () {
			$('#spinner').css('display', 'block');
		},

		hide: function () {
			$('#spinner').css('display', 'none');
		}
	};

	Gallery.Views.PhotoView = Backbone.View.extend({
		tagName: 'li',
		template: $('#gallery-item-template').html(),

		// attributes: {
		// 	'class': function () {
		// 		var lastRowIndex
		// 		if (this.row === ((Gallery.IMAGES / Gallery.IMAGES_PER_ROW) - 1)) {

		// 		}
		// 	}
		// },

		events: {
			'click .tile': 'tileClicked',
			'mouseenter .front': 'fadeIn',
			'mouseleave .front': 'fadeOut'
		},

		initialize: function () {
			this.row = this.options.row;
			this.col = this.options.col;

			Gallery.on('tile:flipToFront', this.flipToFront, this);
			Gallery.on('tile:flipToBack', this.flipToBack, this);

			this.model.set('imageUrl', this.model.get('images').low_resolution.url);
		},

		render: function () {
			var img = $('<img />').attr('src', this.model.get('imageUrl')).load(function () {
				Gallery.trigger('image:loaded');
			});

			$(this.el).html(this.template);
			$(this.el).find('.front').append(img);

			return this;
		},

		tileClicked: function (event) {
			if (this.flipped) {
				Gallery.trigger('tile:flipToFront', this.row, this.col);
			} else {
				var that = this;
				var imageUrl = this.model.get('imageUrl');

				console.log('Started downloading: ' + imageUrl);

				Gallery.Views.SpinnerView.show();
				
				$('<img />').attr('src', imageUrl).load(function () {
					console.log('Finished downloading: ' + imageUrl);
					Gallery.Views.SpinnerView.hide();
					Gallery.trigger('tile:flipToBack', imageUrl, that.row, that.col);
				});
			}
		},

		flip: function (row, col) {
			var that = this;
			var distanceX = Math.abs(this.col - col);
			var distanceY = Math.abs(this.row - row);
			var delay = 100 * (distanceX + distanceY);

			setTimeout(function () {
				that.$('.tile').toggleClass('flipped');
				that.flipped = !that.flipped;
			}, delay);
		},

		flipToFront: function (row, col) {
			this.flip(row, col);
		},

		flipToBack: function (imageUrl, row, col) {
			var tileBack = this.$('.back');
			var backgroundPositionX = this.col * Gallery.TILE_WIDTH;
			var backgroundPositionY = this.row * Gallery.TILE_HEIGHT;

			tileBack.css('background-image', 'url(' + imageUrl + ')');
			tileBack.css('background-position', '-' + backgroundPositionX + 'px -' + backgroundPositionY + 'px');
			
			this.flip(row, col);
		},

		fadeIn: function (event) {
			this.$('.front').stop().animate({ opacity: '1' }, 500);
		},

		fadeOut: function (event) {
			this.$('.front').stop().animate({ opacity: '0.5' }, 500);
		}
	});

	Gallery.Views.PhotoCollectionView = Backbone.View.extend({
		template: Handlebars.compile($('#gallery-template').html()),

		initialize: function () {
			var that = this;

			this.imagesLoaded = 0;
			this.photoViews = [];

			var lastRowIndex = Gallery.IMAGES / Gallery.IMAGES_PER_ROW - 1;

			this.collection.each(function (photo, i) {
				var row = Math.floor(i / Gallery.IMAGES_PER_ROW);
				var className = '';

				if (row === lastRowIndex) {
					className = 'reflection';
				}

				that.photoViews.push(new Gallery.Views.PhotoView({
					className: className,
					model: photo,
					row: Math.floor(i / Gallery.IMAGES_PER_ROW),
					col: i % Gallery.IMAGES_PER_ROW
				}));
			});

			Gallery.on('image:loaded', this.imageLoaded, this);

			this.render();
		},

		render: function () {
			var that = this;

			$(this.el).css('width', Gallery.IMAGES_PER_ROW * Gallery.TILE_WIDTH);

			_(this.photoViews).each(function (photoView) {
				$(that.el).append(photoView.render().el);
			});

			return this;
		},

		imageLoaded: function () {
			this.imagesLoaded += 1;
			console.log('Images loaded:' + this.imagesLoaded);

			if (this.imagesLoaded === Gallery.IMAGES) {
				console.log('All images loaded.');
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
		var photoCollection = new Gallery.Collections.PhotoCollection();

		Gallery.Views.SpinnerView.show();
		photoCollection.fetch({
			dataType: 'jsonp',
			success: function (collection, response) {
				new Gallery.Views.PhotoCollectionView({ 
					collection: photoCollection,
					el: $('#gallery')
				});
			}
		});
	});
})($);