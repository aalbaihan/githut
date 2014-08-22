function ParallelCoordinates(data,options) {

	var self=this;

	//console.log(data);

	var scale_type=options.scale || "linear";

	function nestData(data) {
		return d3.nest()
			.key(function(d){
				return d.repository_language;
			})
			.rollup(function(leaves) {
				var r={};
				options.columns.forEach(function(col){
					r[col]=d3.sum(leaves,function(o){
						return o[col]
					});
					r.year=leaves[0].year;
					r.name=leaves[0]["repository_language"];
					r.name2=leaves[0]["repository_language"];
				})
				return r;
			})
			.entries(data)
			.filter(function(d){
				true;
				return d.values["active_repos_by_url"]>1000;
			})
			.sort(function(a,b){
				return d3.descending(a.values["lang_usage"],b.values["lang_usage"]);
			})
			.slice(0,30)
	}

	var nested_data=nestData(data);
	
	


	
	var WIDTH=1100,
		HEIGHT=550;

	var margins={
		left:20,
		right:30,
		top:30,
		bottom:30
	};

	var padding={
		left:100,
		right:50,
		top:10,
		bottom:5
	};

	var marker_width=[
		4,
		(WIDTH-d3.sum([margins.left,margins.right,padding.left,padding.right]))/options.columns.length
	];

	var svg=d3.select(options.container)
				.append("svg")
				.attr("width",WIDTH)
				.attr("height",HEIGHT);

	var defs=svg.append("defs")
			.append("pattern")
				.attr({
					id:"diagonalHatch",
					width:3,
					height:3,
					patternTransform:"rotate(-45 0 0)",
					patternUnits:"userSpaceOnUse"
				});
	defs.append("rect")
			.attr({
				x:0,
				y:0,
				width:3,
				height:3
			})
			.style({
				stroke:"none",
				fill:"#fff"
			})
	defs.append("line")
			.attr({
				x0:0,
				y1:0,
				x2:0,
				y2:3
			})
			.style({
				stroke:"#A06535",
				"stroke-opacity":0.5,
				"stroke-width":1
			})


	var xscale=d3.scale.ordinal().domain(options.columns).rangePoints([0,WIDTH-(margins.left+margins.right+padding.left+padding.right)]);

	
	
	var yscales={},
		width_scales={};

	var extents={};

	function updateScales() {

			//console.log("NESTED DATA",nested_data)


			extents=(function(){
				var extents={};
				options.columns.forEach(function(d,i){
					extents[d]=d3.extent(nested_data,function(o){
						if(options.dimensions.indexOf(d)>-1) {
							return o.values[d];
						}
						return o.values[d]/o.values[options.ref]
					})
				})
				return extents;
			}())
			//console.log("extents",extents)

			var scales={},
				wscales={};

			options.columns.forEach(function(d){
				
				var use=options.use[d] || d; 
				
				if(options.scale_map[d]=="ordinal") {
					
					scales[d]=d3.scale.ordinal()
							.domain(nested_data.filter(function(){return true;}).sort(function(a, b){
								
								var sorting=options.sorting[use] || d3.ascending;

								if(a.values[use]==b.values[use]) {
									if(d3.ascending(a.key,b.key)>1) {
										a.values[use]*=1.00001;	
									} else {
										b.values[use]*=1.00001;	
									}
								}

								var __a=(a.values[use]),
									__b=(b.values[use]);

								if(options.dimensions.indexOf(d)==-1) {
									__a=(a.values[use]/((options.dimensions.indexOf(use)>-1)?1:a.values[options.ref]));
									__b=(b.values[use]/((options.dimensions.indexOf(use)>-1)?1:b.values[options.ref]))	
								}
								

								return sorting(__a, __b);

							}).map(function(o){
								//return o.values[d];
								if(options.dimensions.indexOf(use)>-1) {
									return o.values[use];
								}
								return o.values[use]/((options.dimensions.indexOf(use)>-1)?1:o.values[options.ref])
							}))
							.rangePoints([HEIGHT-(margins.top+margins.bottom+padding.top+padding.bottom),0]);

					
							
				} else {
					if(extents[d][0]===0) {
						extents[d][0]=0.01;
					}
					//console.log(d,options.scale_map[d]?options.scale_map[d]:"!!"+scale_type);
					scales[d]=d3.scale[options.scale_map[d]?options.scale_map[d]:scale_type]().domain(extents[d]).range([HEIGHT-(margins.top+margins.bottom+padding.top+padding.bottom),0]);//.nice()	
				}

				wscales[d]=d3.scale.linear().domain([0,extents[d][1]]).range(marker_width).nice()
				
			})
			yscales = scales;
			width_scales = wscales;

			
	}

	var yAxes={}
	function createAxes() {
		var axes={};
		options.columns.forEach(function(col){
			axes[col]=d3.svg.axis().scale(yscales[col]).orient(col==options.title_column?"left":"right").tickFormat(function(d){

				if(options.formats[col]) {
					return d3.format(options.formats[col])(d)
				}

				if(col==options.title_column) {
					return "";
				}

				if(scale_type=="log" && (!options.scale_map[col] || options.scale_map[col]=="log")) {
					var values=[0.01,0.1,1,10,100,1000,10000,100000,1000000,10000000]

					if(values.indexOf(d)>-1) {
						return d3.format(d>=100?",.0f":",.2f")(d);
					}
					return "";	
				}
				if(options.scale_map[col]=="ordinal") {
					return d;
				}
				return d3.format(d>=100?",.0f":",.2f")(d);
			})
		})
		yAxes = axes;
	}
	function updateAxes() {
		
		options.columns.forEach(function(col){
			yAxes[col].scale(yscales[col]).tickFormat(function(d){

				if(options.formats[col]) {
					return d3.format(options.formats[col])(d)
				}

				if(col==options.title_column) {
					return "";
				}

				if(options.scale_map[col]=="ordinal") {
					return d;
				}

				if(scale_type=="log") {
					var values=[0.01,0.1,1,10,100,1000,10000,100000,1000000,10000000]

					if(values.indexOf(d)>-1) {
						return d3.format(d>=100?",.0f":",.2f")(d);
					}
					return "";	
				}
				
				return d3.format(d>=100?",.0f":",.2f")(d);
			})
		});

	};


	updateScales();
	//createXAxes();
	//updateAxes();



	//console.log(yAxes);


	var columns=svg.append("g")
					.attr("id","columns")
					.attr("transform","translate("+(margins.left+padding.left)+","+(margins.top+padding.top)+")")

	function addAxes() {

		var column=columns.selectAll("g.column")
					.data(options.columns)
					.enter()
					.append("g")
						.attr("class","column")
						.attr("transform",function(d){
							var x=xscale(d);
							return "translate("+x+","+0+")";
						});

		column.append("text")
				.attr("class","title")
				.attr("x",0)
				.attr("y",-10-padding.top)
				.text(function(d){
					return options.column_map[d]
				})

		var axis=column
				.filter(function(col){
					return options.scale_map[col]=="ordinal" && col!=options.title_column;
				})
				.append("g")
					.attr("class","axis")
					.attr("transform",function(d){
						var x=0,
							y=HEIGHT-(margins.bottom+margins.top);
						return "translate("+x+","+y+")";
					})

		axis.append("line")
			.attr("x1",function(d){
				return -width_scales[d].range()[1]/2;
			})
			.attr("y1",0)
			.attr("x2",function(d){
				return width_scales[d].range()[1]/2;
			})
			.attr("y2",0)
		


		var ticks=axis
			.selectAll("g.tick")
				.data(function(d){

					console.log(width_scales[d].ticks(2))


					var ticks=[
								0,
								//width_scales[d].domain()[1]/2,
								width_scales[d].domain()[1]
							].map(function(v,i){
						return {
							value:i===0?0:v,
							x:(i===0?0:width_scales[d](v)/2),
							domain:width_scales[d].domain(),
							range:width_scales[d].range()
						}
					});
					console.log(ticks)
					return ticks.concat(ticks.map(function(d){
						return {
							value:d.value,
							x:-d.x
						};
					}));
				})
				.enter()
				.append("g")
					.attr("class","tick")
					.classed("start",function(d){
						return d.x<0;
					})
					.classed("end",function(d){
						return d.x>0;
					})
					.attr("transform",function(d){
						return "translate("+d.x+",0)";
					})

		ticks.append("line")
			.attr("x1",0)
			.attr("y1",-3)
			.attr("x2",0)
			.attr("y2",3)

		ticks.append("text")
			.attr("x",0)
			.attr("y",12)
			.text(function(d){
				return d3.format("s")(d.value);
			})
	}
	addAxes();
	function addAxes1() {

		var column=columns.selectAll("g.column")
					.data(options.columns)
					.enter()
					.append("g")
						.attr("class","column")
						.attr("transform",function(d){
							var x=xscale(d);
							return "translate("+x+","+0+")";
						});

			column.append("g")
			      .attr("class", "y axis")
			      .attr("transform", "translate(0,0)")
			      .each(function(d){
			      	d3.select(this).call(yAxes[d])
			      });

			column.append("text")
					.attr("class","title")
					.attr("x",0)
					.attr("y",-10-padding.top)
					.text(function(d){
						return options.column_map[d]
					})
		//});
	}
	//addAxes();

	var languages_group=svg.append("g")
					.attr("id","languages")
					.attr("transform","translate("+(margins.left+padding.left)+","+(margins.top+padding.top)+")");

	var language=languages_group.selectAll("g.lang")
					.data(nested_data,function(d){
						return d.key;
					})
					.enter()
					.append("g")
						.attr("class","lang")
						.on("click",function(d){
							var $this=d3.select(this);
							$this.classed("highlight",!($this.classed("highlight")))
							//this.parentNode.appendChild(this);
						})
						.on("mouseover",function(d){
							d3.select(this).classed("hover",true)
							this.parentNode.appendChild(this);
						})
						.on("mouseout",function(d){
							languages_group.selectAll("g.lang").classed("hover",false)	
						})
						

	var line = d3.svg.line()
		    .x(function(d,i) { return d.x; })
		    .y(function(d,i) { 
		    	if(d.y===0) {
					return yscales[d.col].range()[0]
				}
		    	return yscales[d.col](d.y)
		    })
		    //.interpolate("cardinal")
		    //.tension(0.9)

	function createLanguages(languages) {
		languages.append("g")
				.attr("class","connections")
		

		languages.append("g")
				.attr("class","markers")
		

		
		languages.append("g")
				.attr("class","labels")
		

		languages.append("g")
				.attr("class","lang-label")
				.call(createLangLabel)

		
	}
	
	
	
	createLanguages(language);
	updateConnections(-1);
	updateMarkers(-1);
	updateLabels(-1);
	updateLangLabels(-1);
	

	function updateMarkers(duration) {

		var marker=languages_group
				.selectAll(".lang").select("g.markers")
					.selectAll("g.marker")
						.data(function(d){
							return options.columns.filter(function(col){
									return col!=options.title_column
								}).map(function(col){
									return {
										lang:d.key,
										column:col,
										value:d.values[col],
										ref:d.values[options.ref]
									}
								})
						},function(d){
							return d.lang+"_"+d.column;
						});

		marker.exit()
			.remove();

		var new_markers=marker.enter()
						.append("g")
							.attr("class","marker")
							.classed("ordinal",function(d){
								return options.scale_map[d.column]=="ordinal"
							})
							.attr("transform",function(d){

								var x=xscale(d.column),
									y=yscales[d.column].range()[0];
								
								return "translate("+x+","+y+")";
							})
							

		new_markers
				.filter(function(d){
					return options.scale_map[d.column]=="ordinal"
				})
				.append("rect")
				.attr("x",function(d){
					return 0;
				})
				.attr("y",-4)
				.attr("width",0)
				.attr("height",8)
				.style({
					fill:"url(#diagonalHatch)"
				})

		new_markers
				.filter(function(d){
					return options.scale_map[d.column]!="ordinal"
				})
				.append("circle")
				.attr("cx",0)
				.attr("cy",0)
				.attr("r",2)

		new_markers
				.filter(function(d){
					return options.scale_map[d.column]!="ordinal"
				})
					.append("circle")
					.attr("class","hover")
					.attr("cx",0)
					.attr("cy",0)
					.attr("r",5)
				

		marker
			.transition()
			.duration(duration || options.duration)
			.attr("transform",function(d){

				var x=xscale(d.column),
					y=yscales[d.column](d.value/d.ref);
				if(d[d.column]===0) {
					y=yscales[d.column].range()[0]
				}
				if(options.dimensions.indexOf(d.column)>-1) {
					y=yscales[d.column](d.value)
				}

				if(d.column=="year") {
					//console.log(d.lang,d.value,y,yscales[d.column].domain())
				}
				return "translate("+x+","+y+")";
			})

		marker
			.select("rect")
				.transition()
				.duration(options.duration)
				.attr("x",function(d){
					return -width_scales[d.column](d.value/((options.dimensions.indexOf(d.column)>-1)?1:d.ref))/2;
				})
				.attr("width",function(d){
					return width_scales[d.column](d.value/((options.dimensions.indexOf(d.column)>-1)?1:d.ref));
				})

		marker
			.filter(function(d){
				return d.column=="year"
			})
			.select("circle.hover")
				.on("mouseover",function(d){
					language.classed("year",function(l){
								return l.values.year==d.value;
					});
					
				})
				.on("mouseout",function(d){
					language.classed("year",false)
				})

	}

	function updateConnections(duration) {
		var connection=languages_group
				.selectAll(".lang")
				.select("g.connections")
					.selectAll("g.connection")
					.data(function(d){
						
						var values=options.columns.map(function(col,i){
							var use=options.use[col] || col;

							var val={
								x:xscale(col),
								col:col
							}
							var val2={
								x:xscale(col),
								col:col
							}

							var delta=10;

							if(options.dimensions.indexOf(col)>-1) {

								var y=d.values[use];
								if(typeof y == "number") {
									val.x-=(i==0?0:(width_scales[use](y))/2+delta)
									val2.x+=((i==options.columns.length-1)?0:(width_scales[use](y))/2+delta)
								} else {
									val.x-=delta;
									val2.x+=delta;
								}
								val.y=d.values[use];
								val2.y=d.values[use];
								return [val,val2];
							}

							var y=d.values[use]/((options.dimensions.indexOf(use)>-1)?1:d.values[options.ref]);
							val.y=y;
							val2.y=y;

							val.x-=(i==0?0:(width_scales[use](y))/2+delta)
							val2.x+=((i==options.columns.length-1)?0:(width_scales[use](y))/2+delta)



							return [val,val2]
						});
						
						var flattened=values.reduce(function(a, b) {
							return a.concat(b);
						});
						return [{
								lang:d.key,
								path:flattened
								}]
					},function(d){
						return d.lang;
					});
			
			connection
				.exit()
				.remove();

			var new_connection=connection
									.enter()
									.append("g")
									.attr("class","connection")

			new_connection
				.append("path")
					.attr("class","hover")

			new_connection
				.append("path")
				.attr("class","line")

			var paths=["line","hover"];
			paths.forEach(function(p){
				connection
					.select("path."+p)
					.transition()
					.duration(duration || options.duration)
						.attr("d",function(d){
							return line(d.path)
						})
			});


	}
	
	this.loadData=function(file) {
		//console.log("loading data")

		var unknonw=[];

		d3.csv(file,function(d){
			//d.date=new Date(d.month+"-01");
			//d.timestamp=d.date.getTime();
			d.active_repos_by_url=+d.active_repos_by_url;
			d.lang_usage=+d.lang_usage;
			d.events_per_repo=d.lang_usage / d.active_repos_by_url;
			d.sum_rep_size=(+d.sum_rep_size);
			d.sum_rep_forks=(+d.sum_rep_forks);
			d.sum_rep_openissues=(+d.sum_rep_openissues);
			d.sum_rep_watchers=(+d.sum_rep_watchers);
			//d.repository_fork=(d.repository_fork=="true")
			d.year=options.programming_languages[d.repository_language.toLowerCase()] || 1970;

			return d;
		},function(data){

			//console.log(data)

			nested_data=nestData(data);

			//console.log(nested_data)

			var languages=languages_group.selectAll("g.lang")
					.data(nested_data,function(d){
						return d.key;
					})
					.classed("new",false)

			
			languages
				.exit()
				.remove();

			languages
				.enter()
				.append("g")
					.attr("class","lang")
					.classed("new",true)
					.on("click",function(d){
						var $this=d3.select(this);
						$this.classed("highlight",!($this.classed("highlight")))
						this.parentNode.appendChild(this);
					})
					.on("mouseover",function(d){
						this.parentNode.appendChild(this);
						d3.select(this).classed("hover",true)
					})
					.on("mouseout",function(d){
						languages_group.selectAll("g.lang").classed("hover",false)	
					})
					.call(createLanguages)
			
			
			self.update();

		});

	}

	this.update=function(__options) {

		updateScales();
			
			updateConnections();
			updateMarkers();
			updateLabels();
			updateLangLabels();
	}

	function updateLabels(duration) {
		var labels=languages_group
					.selectAll(".lang")
						.select(".labels")
						.selectAll("g.label")
							.data(function(d){
								return options.columns.filter(function(col){
										return col!=options.title_column
									}).map(function(col){
										return {
											lang:d.key,
											column:col,
											value:d.values[col],
											ref:d.values[options.ref]
										}
									})
							});
		var new_label=labels.enter()
					.append("g")
						.attr("class","label")
						.classed("year",function(d){
							return d.column=="year";
						})

		
		new_label
			.filter(function(d){
				return d.column!="year";
			})
			.append("path")

		new_label
			.filter(function(d){
				return d.column!="year";
			})
			.append("text")
				.attr("x",0)
				.attr("y",3)

		new_label
			.filter(function(d){
				return d.column=="year";
			})
			.append("text")
			.attr("x",0)
			.attr("y",3)
			.text(function(d){

				
				return d.value;
			})

		new_label.append("rect")
					.attr("class","ix")
					.attr("y",-10)
					.attr("height",20)

		labels
			.selectAll("path.label")
				.attr("d","M0,0L0,0");
		labels
			.selectAll("rect.ix")
				.attr("width",0)
				.attr("x,0")

		labels
			.select("text")
				.text(function(d){

					if(options.formats[d.column]) {
						return d3.format(options.formats[d.column])(d.value)
					}

					if(options.dimensions.indexOf(d.column)>-1) {
						return d3.format(d.value>100?",.0f":",.2f")(d.value)
					}
					var y=d.value/d.ref;
					
					return d3.format(y>100?",.0f":",.2f")(y) 
				})

		labels
			.each(function(d) {
				d.marker_width = width_scales[d.column](d.value/((options.dimensions.indexOf(d.column)>-1)?1:d.ref));
				d.text_width = this.getBBox().width;
			});



		labels
			.select("path")
			.attr("class","label")
			.attr("d",function(d){
				var dw=10,
					w=d.text_width+dw;
				return "M"+(w/2+dw/2)+",0l-"+dw/2+",-10l-"+w+",0l0,20l"+w+",0z";
			})
		
		labels
			.select("rect.ix")
				.attr("x",function(d){
					
					return d.text_width/2;
				})
				.attr("width",function(d){
					return d.marker_width+20;
				})

		labels
			.transition()
			.duration(duration || options.duration)
			.attr("transform",function(d){



				var x=xscale(d.column);//-d.width/2,
					y=yscales[d.column](d.value);

				if(d.column=="year") {
					return "translate("+(x+20)+","+y+")"
				}

				if(d[d.column]===0) {
					y=yscales[d.column].range()[0]
				}
				if(options.dimensions.indexOf(d.column)==-1) {
					y=yscales[d.column](d.value/d.ref)
				}

				return "translate("+(x-d.marker_width/2-d.text_width/2-10)+","+y+")";
			})

		labels
			.filter(function(d){
				return d.column=="year"
			})
				.on("mouseover",function(d){
					languages_group
						.selectAll(".lang").classed("year",function(l){
								return l.values.year==d.value;
					});
					
				})
				.on("mouseout",function(d){
					languages_group
						.selectAll(".lang").classed("year",false)
				})

	}
	function updateLabels2(duration) {

		var labels=languages_group
					.selectAll(".lang")
						//.select(".labels")
						.selectAll("g.label")
							.data(function(d){
								return options.columns.filter(function(col){
										return col!=options.title_column
									}).map(function(col){
										return {
											lang:d.key,
											column:col,
											value:d.values[col],
											ref:d.values[options.ref]
										}
									})
							});

		var new_label=labels.enter()
					.append("g")
						.attr("class","label");

		new_label.append("rect")
				.attr("x",0)
				.attr("y",5)
				.attr("width",0)
				.attr("height",18);

		/*new_label.append("path")
				.attr("class","arrow")
				.attr("d","M-5,-13L5,-13L0,-8Z")*/

		new_label.append("text")
			.attr("x",0)
			.attr("y",0);

		labels
			.select("text")
			.text(function(d){

				if(options.formats[d.column]) {
					return d3.format(options.formats[d.column])(d.value)
				}

				if(options.dimensions.indexOf(d.column)>-1) {
					return d3.format(d.value>100?",.0f":",.2f")(d.value)
				}
				var y=d.value/d.ref;
				//return d3.format(",.0f")(d.value);
				return d3.format(y>100?",.0f":",.2f")(y) 
			})

		labels
			.select("rect")
				.attr("width",0)

		labels
			.each(function(d) {
				d.width = this.getBBox().width;
			});

		//language.selectAll("g.label")
		labels
			.select("rect")
				.attr("x",function(d){
					var w=width_scales[d.column](d.value/((options.dimensions.indexOf(d.column)>-1)?1:d.ref));
					return -w/2-(d.width+10);
				})
				.attr("width",function(d){
					//console.log(d)
					return d.width+10;
				})
		labels
			.select("text")
				.attr("x",function(d){
					var w=width_scales[d.column](d.value/((options.dimensions.indexOf(d.column)>-1)?1:d.ref));
					return -w/2-(d.width+10)/2;
				})

				

		//language.selectAll("g.label")
		labels
			.transition()
			.duration(duration || options.duration)
			.attr("transform",function(d){

				//console.log(d)

				var x=xscale(d.column);//-d.width/2,
					y=yscales[d.column](d.value);

				if(d[d.column]===0) {
					y=yscales[d.column].range()[0]
				}
				if(options.dimensions.indexOf(d.column)==-1) {
					//console.log(d.column,d.value,d.ref,d.value/d.ref)
					y=yscales[d.column](d.value/d.ref)
					//if(d.lang=="Java")
					//	//console.log(yscales[d.column].domain())
				}
				return "translate("+x+","+y+")";
			})

		/*labels
			.filter(function(d){
				return d.column=="year"
			})
				.on("mouseover",function(d){
					language.classed("year",function(l){
								return l.values.year==d.value;
					});
					
				})
				.on("mouseout",function(d){
					language.classed("year",false)
				})*/

	}

	function createLangLabel(lang_label) {

		lang_label
				.attr("transform",function(d){
					
					
					var x=xscale(options.title_column),
						y=yscales[options.title_column].range()[0];

					return "translate("+x+","+y+")";

				});

		lang_label.append("rect")
						.attr("class","hover")
						.attr("x",-(padding.left))
						.attr("width",padding.left)
						.attr("y",-13+3)
						.attr("height",18)

		var rect=lang_label.append("rect")
						.attr("x",-(padding.left))
						.attr("width",padding.left)
						.attr("y",-13+3)
						.attr("height",18)

		lang_label.append("text")
				.attr("x",-10)
				.attr("y",3)
				.text(function(d){
					return d.values[options.title_column];
				})
				.each(function(d) {
					d.width = this.getBBox().width;
				});
	}
	function updateLangLabels(duration) {
		languages_group.selectAll(".lang")
			.select("g.lang-label")
				.transition()
				.duration(duration || options.duration)
				.attr("transform",function(d){
					//console.log(yscales[options.title_column].domain())
					var use=options.use[options.title_column] || options.title_column;
					var x=xscale(options.title_column),
						y=yscales[options.title_column](d.values[use]);

					return "translate("+x+","+y+")";

				});
	}
}