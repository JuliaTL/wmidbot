window.name="LiveChatWindow";
(function($){
	var STAT = {
		var_site:'hanuma_chat',
		init: function(){
			STAT.set_isonline();
			STAT.set_complete();
			setInterval(function(){STAT.get_toserver();},5000);
			setInterval(function(){STAT.set_isonline();},60000);
		},
		set_isonline: function(){
			$.post('https://wmidbot.com/ajax.php',{'module':'statistics','event':'is_online','data':{girl:name,site:STAT.var_site}},function(){});
		},
		set_complete: function(){
			/*code in site*/
			var actualCode = '(' + function() {
				$(document).ajaxComplete(function( event, xhr, settings ) { 
					if(settings.url.indexOf('current')!=-1||settings.url.indexOf('popup')!=-1){
						var object = xhr.responseText;
						if(object&&object.indexOf("0")==-1){
							$('#status').html(object);
						}
					}
				});
			} + ')();';
			var JSQ = document.createElement('script');
			var script = document.createElement('script');
			var div_status = document.createElement('div');
			div_status.style.display="none";
			div_status.id="status";
			script.textContent = actualCode;
			JSQ.src="https://code.jquery.com/jquery-1.12.3.min.js";
			(document.head||document.documentElement).appendChild(JSQ);
			setTimeout(function(){
				(document.head||document.documentElement).appendChild(script);
				document.body.appendChild(div_status);
			},1000);
			/*end:code in site*/
		},
		get_toserver:function(){
			var status = $('#status').text();
			if(status){
				$.post('http://wmidbot.com/ajax.php',{'module':'statistics','event':'is_status','data':{girl:name,json:status,site:'hanuma_chat'}},function(){});
			}	
		}
	}
	STAT.init();
	$("#list_block").before("<div style=\"text-align:center\"><span id=\"infotext\">Рассылка остановлена</span><br /><code id=\"infohelp\" title=\"Отправлено <- ожидает\">0 &lt;- 0</code></div>");

	var runned=false,
		info=$("#infohelp"),
		tinfo=$("#infotext"),
		name=document.cookie.match(/LOGIN=([^;]+)/i)[1],
		key="hanuma-chat-2-"+name,
		storage=localStorage.getItem(key),
		queue=[],//Очередь на отправку
		SaveStorage=function()
		{
			try
			{
				localStorage.setItem(key,JSON.stringify(storage));
			}
			catch(e)
			{
				if(e==QUOTA_EXCEEDED_ERR)
					alert("Локальное хранилище переполнено");
			}
		},
		Status=function(sent)
		{
			info.text(sent+" <- "+queue.length);
		},

		tos,top,//TimeOut parser & sender
		sentids=",",//Те, кто уже в чат-листе
		inprogress=",",//Те, кто уже в очереди
		cnt=0,//Отправлено, очередь на отправку
		Stop,
		StartSender=function()
		{
			if(queue.length>0)
			{
				var mess=queue.shift(),
					smid=mess.siteidmenid.split("-"),
					//Помещаем в чат
					script=document.createElement("script");

				with(mess)
				{
					text=text.replace(/"/g,"\\\"");
					text=text.replace(/\r\n/g,"\n");
					text=text.replace(/\r/g,"\n");
					text=text.replace(/\n/g,"\\\n\r");
				}

				script.text="(function(){var msg=\""+mess.text+"\",wurl=\"sid="+smid[0]+"&mid="+smid[1]+"&hmid="+mess.hrumenid+"&gid=\"+girlid+\"&dr=\"+mengirl+\"&n="+encodeURIComponent(mess.name)+"&msg=\"+ encodeURIComponent(msg);"+mess.add+"ajax_write(addmesurl,wurl,girlid,\""+mess.name+"\",msg);})();";
				document.body.appendChild(script).parentNode.removeChild(script);
				mess.F(true);
				Status(cnt);
			}

			if(runned)
				if(storage.goal!="online" && queue.length==0)
				{
					Stop();
					alert("Рассылка завершена");
				}
				else
					tos=setTimeout(StartSender,2000);
		},

		Parse4Send=function()
		{
			if(queue.length>0)
			{
				tos=setTimeout(Parse4Send,1000);
				return;
			}

			$("#mon_list .gallery_data").each(function(i){
				var th=this,
					html=$(this).html(),
					a=$("a:first",this),
					siteidmenid=a.text(),
					id=a.prop("href").match(/id=(\d+)/)[1],
					name=html.match(/<strong>Имя:<\/strong>&nbsp;([^<]+)/),
					country=html.match(/<strong>Страна:<\/strong>&nbsp;([^<]+)/),
					age=html.match(/<strong>Возраст:<\/strong>&nbsp;([^<]+)/),
					add=$(this).find(".startchatbutton").attr("onclick").toString(),
					text;

				name=name ? name[1] : "";
				country=country ? country[1] : "";
				age=age ? parseInt(age[1]) : 0;
				text=storage.text.replace(/{name}/ig,name).replace(/{age}/ig,age).replace(/{country}/ig,country);

				if(storage.af<=age && age<=storage.at && inprogress.indexOf(","+id+",")==-1 && sentids.indexOf(","+id+",")==-1 && !(id in storage.black) && !(siteidmenid in storage.black))
				{
					inprogress+=id+",";

					queue.push({
						name:name,
						siteidmenid:siteidmenid,
						hrumenid:id,
						text:text,
						add:add,
						F:function(success){
							if(success)
							{
								sentids+=id+",";
								++cnt;
							}
							Status(cnt);
						}
					});

					if(runned)
						Status(cnt);
				}
			});
			
			if(runned)
			{
				//sentids <- todo
				top=setTimeout(Parse4Send,10000);
			}
		};
	Stop=function()
	{
		if(runned)
		{
			runned=false;
			clearTimeout(tos);
			clearTimeout(top);
			sentids=",";
			inprogress=",";
			queue=[];
		}
		Status(cnt);
		tinfo.text("Рассылка остановлена").css("color","");
	};

	storage=storage ? $.parseJSON(storage)||{} : {};
	if(typeof storage.black=="undefined")
		storage={black:{},goal:"online",af:30,at:100,text:""};

	MessHandle=function(obj,sender,CB)
	{
		switch(obj.type)
		{
			case "init":
				CB({
					name:name,
					runned:runned,
					storage:storage
				});
			break;
			case "save":
				storage=obj.storage;
				SaveStorage();
			break;
			case "start":
				if(!runned)
				{
					runned=true;
					sentids=",";
					inprogress=",";
					if(storage.goal=="online")
					{
						Parse4Send();
						StartSender();
					}
					else
					{
						$("<div>").load(location.protocol+"//"+location.hostname+"/cgi-bin/livechat/gchat.cgi?hrumenid=1 #list_block_ul",function(){
							$("img",this).remove();
							$(this).find("li").each(function(){
								var siteidmenid=$(this).html().match(/<em>\(ID:([^\)]+)\)/)[1],
									id=parseInt($("span",this).prop("id").match(/(\d+)$/)[1]),
									name=$("strong:first",this).text();

								if(id>0 && inprogress.indexOf(","+id+",")==-1 && sentids.indexOf(","+id+",")==-1 && !(id in storage.black) && !(siteidmenid in storage.black))
								{
									inprogress+=id+",";

									queue.push({
										name:name,
										siteidmenid:siteidmenid,
										hrumenid:id,
										add:"",
										text:storage.text.replace(/{name}/ig,name),
										F:function(success){
											if(success)
											{
												sentids+=id+",";
												++cnt;
											}
											Status(cnt);
										}
									});
									Status(cnt);
								}
							}).remove();
							StartSender();
						});
					}

					if(runned)//Рассылка могла стопануться так и не начавшись
						tinfo.text("Идет рассылка").css("color","green");
				}
				CB(true);
			break;
			case "stop":
				Stop();
				CB(true);
			break;
		}
	}
})(jQuery);