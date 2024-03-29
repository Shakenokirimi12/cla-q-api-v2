export default {
	async fetch(request, env, ctx) {
		const { pathname } = new URL(request.url);
		if (request.method == "OPTIONS") {
			return new Response(null, await headerMaker(200, false));
		}
		else if (pathname.includes("/system") && pathname.includes("/v2/")) {
			return await handleRequest_System(request, env);
		}
		else if (pathname.includes("/teacher") && pathname.includes("/v2/")) {
			return await handleRequest_Teacher(request, env);
		}
		else if (pathname.includes("/student") && pathname.includes("/v2/")) {
			return await handleRequest_Student(request, env);
		}
		else {
			return new Response(JSON.stringify([{ "message": "API pathname is not described or wrong.", "status_Code": "NE-12", "result": "error" }]), await headerMaker(400, false));
		}
	},
};

///////////////////////////////////////////////////////振り分け部分終了////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////システムAPI開始////////////////////////////////////////////////////////
async function handleRequest_System(request, env) {
	const { pathname } = new URL(request.url);
	if (pathname === "/v2/system/class_info/pdf") {
		try {
			const data = await request.json();
			var class_Code = data.class_Code;
			if (IsInvalid(class_Code)) {
				console.error("required value is not specified.");
				return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		} catch (error) {
			console.error("required value is not specified.");
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		try {
			const { results: pdfFiles } = await env.D1_DATABASE.prepare(
				//PDFファイルの一覧を取得
				"SELECT * FROM pdf_Files WHERE class_Code = ?"
			).bind(class_Code).all();

			pdfFiles.push({ "message": "PDF File list succesfully fetched.", "status_Code": "CPE-01", "result": "success", "pdf": "true" });

			console.log("return pdfList.", pdfFiles);

			return new Response(JSON.stringify(pdfFiles), await headerMaker(200, false));

		} catch (error) {
			console.log(error);
			return new Response(JSON.stringify([{ "message": "Internal server error.", "status_Code": "CPE-01", "result": "error" }]), await headerMaker(500, false));
		}
	} else if (pathname === "/v2/system/detect_role") {
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			if (IsInvalid(userName) || IsInvalid(userEmail)) {
				console.error("required value is not specified.");
				return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		} catch (error) {
			console.error("required value is not specified.");
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		try {
			const { results: specifiedTeachers } = await env.D1_DATABASE.prepare(
				//生徒の答え一覧を取得
				"SELECT * FROM Teachers WHERE user_Email = ? AND 	user_Name = ?"
			).bind(userEmail, userName).all();
			if (specifiedTeachers.length == 1) {
				var result = [{ "message": "user is teacher.", "status_Code": "DR-01", "result": "success" }];
			} else {
				var result = [{ "message": "user is student.", "status_Code": "DR-02", "result": "success" }];
			}
			console.log(result);
			return new Response(JSON.stringify(result), await headerMaker(200, false));
		} catch (error) {
			console.log(error);
			return new Response(JSON.stringify([{ "message": "Internal server error." + error, "status_Code": "DRE-01", "result": "error" }]), await headerMaker(500, false));
		}
	} else if (pathname === "/v2/system/teapot") {
		return new Response("How do you know this API pathname? 418 I'm a teapot.", {
			status: 418,
			headers: {
				"Content-Type": "text/plain",
				"Access-Control-Allow-Credentials": "true",
				"Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type"
			}
		});
	} else {
		console.info("API pathname is not described or wrong.");
		return new Response(JSON.stringify([{ "message": "API pathname is not described or wrong.", "status_Code": "NE-12", "result": "error" }]), await headerMaker(400, false));
	}
}
///////////////////////////////////////////////////////システムAPI終了////////////////////////////////////////////////////////





//////////////////////////////////////////////////////先生用エンドポイント開始///////////////////////////////////////////////////
async function handleRequest_Teacher(request, env) {
	const { pathname } = new URL(request.url);
	if (pathname === "/v2/teacher/class_info") {//教師-クラス作成(statuscode: CI or CEI)
		//データ吸出し
		try {
			const data = await request.json();
			var userEmail = data.userEmail;
			var class_Code = data.class_Code;
			if (IsInvalid(class_Code) || IsInvalid(userEmail)) {
				console.error("required value is not specified.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "InternalErrorMessage": String(error), "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		try {
			const { results: specifiedClassInfo } = await env.D1_DATABASE.prepare(//接続済みのクラスを検索
				"SELECT * FROM Classes WHERE class_Code = ? AND created_Teacher_Email = ?"
			).bind(class_Code, userEmail).all();
			console.log("Got class info successfully.")
			specifiedClassInfo.push({ "message": "Got class info successfully.", "status_Code": "CI-01", "result": "success" })
			return new Response(JSON.stringify(specifiedClassInfo), await headerMaker(200, false));
		}
		catch (error) {
			console.log("Failed to got class info.", error)
			return new Response(JSON.stringify([{ "message": "Failed to got class info. This is internal error. Contact support.", "InternalErrorMessage": String(error), "status_Code": "CIE-01", "result": "error" }]), await headerMaker(403, false));
		}
	}
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/create_class") {//教師-クラス作成(statuscode: C or CE)
		//データ吸出し
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			if (IsInvalid(userName) || IsInvalid(userEmail)) {
				console.error("required value is not specified.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified or wrong.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "InternalErrorMessage": String(error), "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, false));
		}
		else {//生徒でない=先生だった時
			try {
				var currentTime = String(Math.floor(new Date().getTime() / 1000));
				var generated_Class_Code = String(generateClassCode());//クラスコードを生成

				var defaultsettingjson = {
					MaximumStudent: 100,
					AIOption: "deny"
				};

				await env.D1_DATABASE.prepare("INSERT INTO Classes VALUES ( ? , ? , ? , ? , ? , ? , ? , ? , ? )"
				).bind(generated_Class_Code, currentTime, userName, userEmail, 0, 0, "true", "0", JSON.stringify(defaultsettingjson)).run();

				console.log("Class created successfully.")
				return new Response(JSON.stringify([{ "message": "Created class successfully.", "class_Code": generated_Class_Code, "status_Code": "CC-01", "result": "success" }]), await headerMaker(200, false));
			}
			catch (error) {
				console.log("Failed to create class.", error)
				return new Response(JSON.stringify([{ "message": "Failed to create class. Internal error. Contact support.", "InternalErrorMessage": String(error), "status_Code": "CCE-01", "result": "error" }]), await headerMaker(403, false));
			}
		}
	}
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/delete_class") {//クラス削除(statuscode CD or CDE)
		//データ吸出し
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			var class_Code = data.class_Code;
			if (IsInvalid(userName) || IsInvalid(userEmail) || IsInvalid(class_Code)) {
				console.error("required value is not specified.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, false));
		}
		else {//先生アカウントだった時
			try {
				await env.D1_DATABASE.prepare(//クラスを削除
					"DELETE FROM Classes WHERE class_Code = ? AND created_Teacher_Name = ? AND created_Teacher_Email = ?"
				).bind(class_Code, userName, userEmail).run();
			}
			catch (error) {
				console.log("Failed to delete class. User may not be an owner of this class.", error)
				return new Response(JSON.stringify([{ "message": "Failed to delete specitfied class. Are you an owner of the class?", "status_Code": "CDE-11", "result": "error" }]), await headerMaker(403, false));
			}
			try {
				await env.D1_DATABASE.prepare(//接続済みリストからそのクラスにつながっている生徒を削除
					"DELETE FROM ConnectedUsers WHERE class_Code = ?"
				).bind(class_Code).run();
			}
			catch (error) {
				console.log("Failed to delete joined user info.", error)
				return new Response(JSON.stringify([{ "message": "Database error:failed to delete joined user info. Contact support.", "InternalErrorMessage": String(error), "status_Code": "CDE-01", "result": "error" }]), await headerMaker(500, false));
			}
			console.log("Class deleted successfully.")
			return new Response(JSON.stringify([{ "message": "Deleted class successfully.", "class_Code": class_Code, "status_Code": "CD-01", "result": "success" }]), await headerMaker(200, false));
		}
	}//クラス削除　終了
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/inactivate_class") {//クラスの無効化(通常使用しない)(statuscode IC or ICE)
		//データ吸出し
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			var class_Code = data.class_Code;
			if (IsInvalid(userName) || IsInvalid(userEmail) || IsInvalid(class_Code)) {
				console.error("required value is not specified.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, false));
		}
		else {//先生アカウントだった時
			try {
				const { results: specifiedClassInfo } = await env.D1_DATABASE.prepare(
					"SELECT * FROM Classes WHERE class_Code = ?"
				).bind(class_Code).all();
				var class_owner = specifiedClassInfo[0].created_Teacher_Name;
				var class_owner_Email = specifiedClassInfo[0].created_Teacher_Email;
				var class_active = specifiedClassInfo[0].active;
				console.log("classの情報:", specifiedClassInfo, class_owner, class_owner_Email, class_active)
			}
			catch (error) {
				console.log("Specified class not found.", error)
				return new Response(JSON.stringify([{ "message": "Specified class not found.", "status_Code": "ICE-12", "result": "error" }]), await headerMaker(404, false));
			}
			if (class_owner == userName && class_owner_Email == userEmail && class_active == "true") {
				await env.D1_DATABASE.prepare(
					"UPDATE Classes SET active = ? , students = ? WHERE class_Code = ? AND created_Teacher_Name = ? AND created_Teacher_Email = ?"
				).bind("false", "0", class_Code, userName, userEmail).run();//クラスを非アクティブ化
			}
			else {
				if (class_active == "false") {
					console.log("Failed to inactivate class.Class was already inactive.")
					return new Response(JSON.stringify([{ "message": "Class is already inactive.", "status_Code": "ICE-13", "result": "error" }]), await headerMaker(400, false));
				} else {
					console.log("Failed to inactivate class. User is not an owner of this class.")
					return new Response(JSON.stringify([{ "message": "You are not an owner of the class.", "status_Code": "ICE-11", "result": "error" }]), await headerMaker(403, false));
				}
			}
		}
		try {
			await env.D1_DATABASE.prepare(//接続済みリストからそのクラスにつながっている生徒を削除
				"DELETE FROM ConnectedUsers WHERE class_Code = ?"
			).bind(class_Code).run();
		}
		catch (error) {
			console.log("Failed to delete joined user info.", error)
			return new Response(JSON.stringify([{ "message": "Database error:failed to delete joined user info. Contact support.", "InternalErrorMessage": String(error), "status_Code": "ICE-01", "result": "error" }]), await headerMaker(500, false));
		}
		console.log("Class inactivated successfully.")
		return new Response(JSON.stringify([{ "message": "Inactivated class successfully.", "class_Code": class_Code, "status_Code": "IC-01", "result": "success" }]), await headerMaker(200, false));
	}
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/activate_class") {//クラスの有効化(通常使用しない)(statuscode AC or ACE)
		//データ吸出し
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			var class_Code = data.class_Code;
			if (IsInvalid(userName) || IsInvalid(userEmail) || IsInvalid(class_Code)) {
				console.error("required value is not specified.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, false));
		}
		else {//先生アカウントだった時
			try {
				const { results: specifiedClassInfo } = await env.D1_DATABASE.prepare(
					"SELECT * FROM Classes WHERE class_Code = ?"
				).bind(class_Code).all();
				var class_owner = specifiedClassInfo[0].created_Teacher_Name;
				var class_owner_Email = specifiedClassInfo[0].created_Teacher_Email;
				var class_active = specifiedClassInfo[0].active;
				console.log("classの情報:", specifiedClassInfo, class_owner, class_owner_Email, class_active)
			}
			catch (error) {
				console.log("Specified class not found.", error)
				return new Response(JSON.stringify([{ "message": "Specified class not found.", "InternalErrorMessage": String(error), "status_Code": "ACE-12", "result": "error" }]), await headerMaker(403, false));
			}
			if (class_owner == userName && class_owner_Email == userEmail && class_active == "false") {
				await env.D1_DATABASE.prepare(//クラスを非アクティブ化
					"UPDATE Classes SET active = ? WHERE class_Code = ? AND created_Teacher_Name = ? AND created_Teacher_Email = ?"
				).bind("true", class_Code, userName, userEmail).run();
			}
			else {
				if (class_active == "true") {
					console.log("Failed to inactivate class. Class was already active.")
					return new Response(JSON.stringify([{ "message": "Class is already active.", "status_Code": "ACE-13", "result": "error" }]), await headerMaker(400, false));
				} else {
					console.log("Failed to inactivate class. User is not an owner of this class.")
					return new Response(JSON.stringify([{ "message": "You are not an owner of the class.", "status_Code": "ACE-11", "result": "error" }]), await headerMaker(403, false));
				}
			}
		}
		console.log("Class Activated successfully.")
		return new Response(JSON.stringify([{ "message": "Activated class successfully.", "class_Code": class_Code, "status_Code": "AC-01", "result": "success" }]), await headerMaker(200, false));
	}
	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/rejoin_class") {//クラスへの再参加(statuscode RJ or RJE)
		//データ吸出し
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			var class_Code = data.class_Code;
			if (IsInvalid(userName) || IsInvalid(userEmail) || IsInvalid(class_Code)) {
				console.error("required value is not specified.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, false));
		}
		else {//先生アカウントだった時
			const { results: specifiedClassInfo } = await env.D1_DATABASE.prepare(
				"SELECT * FROM Classes WHERE class_Code = ?"
			).bind(class_Code).all();

			if (specifiedClassInfo.length === 0) {
				return new Response(JSON.stringify([{ "message": "Specified class not found.", "status_Code": "RJE-12", "result": "error" }]), await headerMaker(404, true))
			}
			if (specifiedClassInfo[0].created_Teacher_Email != userEmail) {
				console.log(specifiedClassInfo);
				console.log(specifiedClassInfo[0].created_Teacher_Email);
				return new Response(JSON.stringify([{ "message": "You are not an owner of specified class.", "status_Code": "RJE-11", "result": "error" }]), await headerMaker(403, true))
			}
			if (specifiedClassInfo[0].active == "reserved" || specifiedClassInfo[0].active == "false") {//無効・予約済みクラスは自動で有効化
				try {
					await env.D1_DATABASE.prepare(//クラスをアクティブ化
						"UPDATE Classes SET active = ? , students = ? WHERE class_Code = ? AND created_Teacher_Name = ? AND created_Teacher_Email = ?"
					)
						.bind("true", "0", class_Code, userName, userEmail)
						.run();
				}
				catch (error) {
					return new Response(JSON.stringify({ "message": "Server Database error.", "InternalErrorMessage": String(error), "status_Code": "RJE-13", "result": "error" }), await headerMaker(400, true))
				}
			}
			specifiedClassInfo.push({ "message": "Reconnected specified class succesfully.", "status_Code": "RJ-01", "result": "success" })
			return new Response(JSON.stringify(specifiedClassInfo), await headerMaker(200, true))
		}
	}
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/get_StudentsList") {//生徒のリストを取得。
		//データ吸出し
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			var class_Code = data.class_Code;
			if (IsInvalid(userName) || IsInvalid(userEmail) || IsInvalid(class_Code)) {
				console.error("required value is not specified.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, false));
		}
		else {//先生アカウントの時
			try {
				const { results: studentList } = await env.D1_DATABASE.prepare(
					"SELECT * FROM ConnectedUsers WHERE class_Code = ?"
				).bind(class_Code).all();
				return new Response(JSON.stringify(studentList), await headerMaker(200, false));
			}
			catch (error) {
				console.log(error)
				return new Response(JSON.stringify([{ "message": "Internal server error.", "status_Code": "SLIE-01", "result": "error" }]), await headerMaker(500, false));
			}
		}
	}
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/get_AnswersList") {
		//データ吸出し
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			var class_Code = data.class_Code;
			var question_Number = data.question_Number;
			if (IsInvalid(userName) || IsInvalid(userEmail) || IsInvalid(class_Code) || IsInvalid(question_Number)) {
				console.error("required value is not specified.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		var isStudent = false;
		// @ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, false));
		}
		else {//先生アカウントの時
			try {
				const { results: answerList } = await env.D1_DATABASE.prepare(//生徒の答え一覧を取得
					"SELECT * FROM Answers WHERE class_Code = ? AND question_Number = ?"
				).bind(class_Code, question_Number).all();
				console.log("return answerList.", answerList)
				return new Response(JSON.stringify(answerList), await headerMaker(200, false));
			}
			catch (error) {
				console.log(error)
				return new Response(JSON.stringify([{ "message": "Internal server error.", "status_Code": "ALIE-01", "result": "error" }]), await headerMaker(500, false));
			}
		}
	}
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/start_question") {
		//データ吸出し
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			var class_Code = data.class_Code;
			if (IsInvalid(userName) || IsInvalid(userEmail) || IsInvalid(class_Code)) {
				console.error("required value is not specified.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		var isStudent = false;
		// @ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, false));
		}
		else {//先生アカウントの時
			try {
				const { results: specifiedClassInfo } = await env.D1_DATABASE.prepare(
					"SELECT * FROM Classes WHERE class_Code = ?"
				)
					.bind(class_Code)
					.all();
				var question_Number;
				question_Number = Number(specifiedClassInfo[0].latest_Question_Number) + 1;
				const result = await env.D1_DATABASE.prepare(
					"UPDATE Classes SET current_Question_Number = ?, latest_Question_Number= ? WHERE class_Code = ? AND created_Teacher_Name = ? AND created_Teacher_Email = ?"
				).bind(String(question_Number), String(question_Number), class_Code, userName, userEmail).run();

				if (result.meta.changes > 0) {
					// 成功した場合の処理
					console.log('UPDATEが実行されました');
					console.log("Started question of class : " + class_Code);
					return new Response(JSON.stringify(
						[{
							"message": "Started question of class : " + class_Code + ": question " + question_Number,
							"status_Code": "AS-01",
							"result": "success",
							"question_Number": question_Number
						}]), await headerMaker(200, true),);
				} else {
					// 実行されたが、行が変更されなかった場合の処理
					console.log('UPDATEが実行されましたが、行は変更されませんでした');
					console.log("Cannnot start question. Maybe classCode or questionNum is not true. ");
					return new Response(JSON.stringify(
						[{
							"message": "Cannnot start question. Maybe classCode or questionNum is not true. ",
							"status_Code": "ASE-12", "result": "error"
						}]), await headerMaker(403, false));
				}
			}
			catch (error) {
				console.error(error);
				console.error("Database error.");
				return new Response(JSON.stringify([{ "message": "Database error.", "status_Code": "ASE-01", "result": "error" }]), await headerMaker(500, false));
			}
		}
	}
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/end_question") {
		//データ吸出し
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			var class_Code = data.class_Code;
			if (IsInvalid(userName) || IsInvalid(userEmail) || IsInvalid(class_Code)) {
				console.error("required value is not specified. At 1177");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, false));
		}
		else {//先生アカウントの時
			try {
				const result = await env.D1_DATABASE.prepare(
					"UPDATE Classes SET current_Question_Number = ? WHERE class_Code = ? AND created_Teacher_Name = ? AND created_Teacher_Email = ?"
				).bind("0", class_Code, userName, userEmail).run();

				if (result.meta.changes > 0) {
					// 成功した場合の処理
					console.log('UPDATEが実行されました');
					console.log("Finished question of class : " + class_Code);
					return new Response(JSON.stringify([{ "message": "Finished question of class : " + class_Code, "status_Code": "AF-01", "result": "success" }]), await headerMaker(200, false));
				} else {
					// 実行されたが、行が変更されなかった場合の処理
					console.log("UPDATEが実行されましたが、行は変更されませんでした");
					console.log("Cannnot finish question. Maybe classCode or questionNum is not true. ");
					return new Response(JSON.stringify([{ "message": "Cannnot finish question. Maybe classCode or questionNum is not true. ", "status_Code": "AFE-12", "result": "error" }]), await headerMaker(403, false));
				}
			}
			catch (error) {
				console.error("Database error.");
				return new Response(JSON.stringify([{ "message": "Database error.", "status_Code": "AFE-01", "result": "error" }]), await headerMaker(403, false));
			}
		}
	}
	///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/answers_all") {//スプレッドシート書き出し用。いじるな。
		//データ吸出し
		try {
			const data = await request.json();
			var class_Code = data.class_Code;
			if (IsInvalid(class_Code)) {
				console.error("required value is not specified.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		try {
			const { results: answerList } = await env.D1_DATABASE.prepare(//生徒の答え一覧を取得
				"SELECT * FROM Answers WHERE class_Code = ?"
			).bind(class_Code).all();
			return new Response(JSON.stringify(answerList), await headerMaker(200, false));
		}
		catch (error) {
			console.log(error)
			return new Response(JSON.stringify([{ "message": "Internal server error.", "status_Code": "ALIE-01", "result": "error" }]), await headerMaker(500, false));
		}
	}
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/end_question") {
		//データ吸出し
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			var class_Code = data.class_Code;
			if (IsInvalid(userName) || IsInvalid(userEmail) || IsInvalid(class_Code)) {
				console.error("required value is not specified.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, false));
		}
		else {//先生アカウントの時
			try {
				const result = await env.D1_DATABASE.prepare(
					"UPDATE Classes SET current_Question_Number = ? WHERE class_Code = ? AND created_Teacher_Name = ? AND created_Teacher_Email = ?"
				).bind("0", class_Code, userName, userEmail).run();

				if (result.meta.changes > 0) {
					// 成功した場合の処理
					console.log('UPDATEが実行されました');
					console.log("Finished question of class : " + class_Code);
					return new Response(JSON.stringify([{ "message": "Finished question of class : " + class_Code, "status_Code": "AF-01", "result": "success" }]), await headerMaker(200, false));
				} else {
					// 実行されたが、行が変更されなかった場合の処理
					console.log("UPDATEが実行されましたが、行は変更されませんでした");
					console.log("Cannnot finish question. Maybe classCode or questionNum is not true. ");
					return new Response(JSON.stringify([{ "message": "Cannnot finish question. Maybe classCode or questionNum is not true. ", "status_Code": "AFE-12", "result": "error" }]), await headerMaker(403, false));
				}
			}
			catch (error) {
				console.error("Database error.");
				return new Response(JSON.stringify([{ "message": "Database error.", "status_Code": "AFE-01", "result": "error" }]), await headerMaker(403, false));
			}
		}
	}
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/export") {//GASのCORSの条件がめっちゃ複雑なので、プロキシを組む
		try {
			const data = await request.json();
			var userEmail = data.userEmail;
			var class_Code = data.class_Code;
			if (!(IsInvalid(class_Code)) || !(IsInvalid(userEmail))) {
				var url =
					"https://script.google.com/macros/s/AKfycbzuTb7WXyLwuIdk8VblqiSDtFtMv3QtFv6KjxXFl3hL4HibGZDNJLoB053SJWlmWDoU/exec";
				var postData = {
					userEmail: userEmail,
					class_Code: class_Code
				}
				try {
					const response = await fetch(url, {
						headers: {
							"Content-Type": "application/json",
							Origin: "https://cla-q.net/",
						},
						body: JSON.stringify(postData),
						method: "POST"
					});

					const responseData = await response.json();

					console.log(responseData.sharelink);

					return new Response(JSON.stringify(responseData), await headerMaker(200, false));
				} catch (error) {
					console.log(error);
					return new Response(JSON.stringify([{ "message": "Error fetching value to GAS." + error, "status_Code": "SHE-01", "result": "error" }]), await headerMaker(500, false));
				}
			}
			else {
				console.log("必要な値がないか壊れています。", data)
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {
			console.log("必要な値がないか壊れています。" + error)
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
	}
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/settings") {//ChatAIの使用許可や、最大参加人数を設定可能に。Prefix:S,SE
		try {
			const data = await request.json();
			var userEmail = data.userEmail;
			var class_Code = data.class_Code;
			if (IsInvalid(class_Code) || IsInvalid(userEmail)) {
				console.log("必要な値がないか壊れています。", data)
				return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
			else {
				var settingjson = data.settings;
				await env.D1_DATABASE.prepare(//Uptime用のテストクラスの生徒数を0に変更
					"UPDATE Classes SET Settings = ? WHERE class_Code = ?"
				)
					.bind(JSON.stringify(settingjson), class_Code)
					.run();
				return new Response(JSON.stringify([{ "message": "Successfully saved class settings.", "status_Code": "S-01", "result": "success" }]), await headerMaker(200, false));
			}
		}
		catch (error) {
			console.log("必要な値がないか壊れています。" + error)
			return new Response(JSON.stringify([{ "message": "Required value is not specified." + error, "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));

		}
	}
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/reserve_class") {//(prefix:error)
		//データ吸出し
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			if (IsInvalid(userName) || IsInvalid(userEmail)) {
				console.error("required value is not specified.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified or wrong.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "InternalErrorMessage": String(error), "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, false));
		}
		else {//生徒でない=先生だった時=正常時処理
			try {
				var currentTime = String(Math.floor(new Date().getTime() / 1000));
				var generated_Class_Code = String(generateClassCode());//クラスコードを生成
				var defaultsettingjson = {
					MaximumStudent: 100,
					AIOption: "deny"
				};
				await env.D1_DATABASE.prepare(
					"INSERT INTO Classes VALUES ( ? , ? , ? , ? , ? , ? , ? , ? , ? )"
				).bind(generated_Class_Code, currentTime, userName, userEmail, 0, 0, "reserved", "0", JSON.stringify(defaultsettingjson)).run();
				console.log("Reserved class successfully.")
				return new Response(JSON.stringify([{ "message": "Reserved class successfully.", "class_Code": generated_Class_Code, "status_Code": "RC-01", "result": "success" }]), await headerMaker(200, false));
			}
			catch (error) {
				console.log("Failed to create class.", error)
				return new Response(JSON.stringify([{ "message": "Failed to reserve class. Internal error. Contact support.", "InternalErrorMessage": String(error), "status_Code": "RCE-01", "result": "error" }]), await headerMaker(403, false));
			}
		}
	}
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/teacher/list_reserved_class") {//(prefix:LRC)
		//データ吸出し
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			if (IsInvalid(userName) || IsInvalid(userEmail)) {
				console.error("required value is not specified.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		var isStudent = false;
		// @ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, false));
		}
		else {//先生アカウントの時
			try {
				const { results: answerList } = await env.D1_DATABASE.prepare(//生徒の答え一覧を取得
					"SELECT * FROM Classes WHERE active = ? AND created_Teacher_Email = ?"
				)
					.bind("reserved", userEmail)
					.all();
				console.log("return answerList.", answerList)
				return new Response(JSON.stringify(answerList), await headerMaker(200, false));
			}
			catch (error) {
				console.log(error)
				return new Response(JSON.stringify([{ "message": "Internal server error.", "InternalErrorMessage": String(error), "status_Code": "LRCE-01", "result": "error" }]), await headerMaker(500, false));
			}
		}
	}
	else {
		console.info("API pathname is not described or wrong.")
		return new Response(JSON.stringify([{ "message": "API pathname is not described or wrong.", "status_Code": "NE-12", "result": "error" }]), await headerMaker(404, false));
	}
}

//////////////////////////////////////////////////////先生用エンドポイント終了///////////////////////////////////////////////////

/////////////////////////////////////////////////////生徒用エンドポイント開始////////////////////////////////////////////////////
async function handleRequest_Student(request, env) {
	const { pathname } = new URL(request.url);
	if (pathname === "/v2/student/join") {//生徒のクラス参加
		const data = await request.json();
		var class_Code = data.class_Code;
		var userName = data.userName;
		var userEmail = data.userEmail;
		console.log(class_Code, userName, userEmail)
		if (IsInvalid(class_Code) && IsInvalid(userName)) {
			console.error("required value is not specified.",);//生徒数の変更失敗処理
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		console.log(class_Code)
		//クラス参加処理スタート
		try {
			const { results: specifiedClassInfo } = await env.D1_DATABASE.prepare(
				"SELECT * FROM Classes WHERE class_Code = ?"
			)
				.bind(class_Code)
				.all();

			console.log("Query results:", specifiedClassInfo);

			if (specifiedClassInfo.length != 0) {//クラスが存在する
				if (specifiedClassInfo[0].active == "true") {//クラスがアクティブかの切り分け
					try {//生徒数の変更
						try {
							var class_Settings = JSON.parse(specifiedClassInfo[0].Settings);
							var Maximum_Student_Count;
							if (IsInvalid(class_Settings.MaximumStudent)) {//v3.0以前のクラスの対応
								Maximum_Student_Count = 100;
							}
							else {
								Maximum_Student_Count = class_Settings.MaximumStudent;
							}

							if (specifiedClassInfo[0].students != Maximum_Student_Count) {//最大数チェック

								const result = await env.D1_DATABASE.prepare(
									"UPDATE Classes SET students = " + String(Number(specifiedClassInfo[0].students) + 1) + " WHERE class_Code = " + class_Code
								).run();
								console.log(result.meta.changes + "箇所のデータが変更されました。");
								if (!(result.meta.changes > 0)) {
									console.error("Update failed.");//生徒数の変更失敗処理
									return new Response(JSON.stringify([{ "message": "Update failed.", "status_Code": "JE-05", "result": "error" }]), await headerMaker(500, false));
								}
							}
							else {//接続生徒数が最大値を超えたとき
								return new Response(JSON.stringify([{ "message": "Exceeded Maximum Student Count. You cannnot connect this class.", "status_Code": "JE-06", "result": "error" }]), {
									status: 403,
									headers: {
										"Content-Type": "application/json",
										"Access-Control-Allow-Origin": "https://app.cla-q.net",
										"Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
										"Access-Control-Allow-Headers": "Content-Type"
									},
								});
							}
						}
						catch (error) {
							const result = await env.D1_DATABASE.prepare(
								"UPDATE Classes SET students = " + String(Number(specifiedClassInfo[0].students) + 1) + " WHERE class_Code = " + class_Code
							).run();
							console.log(result.meta.changes + "箇所のデータが変更されました。");
							if (!(result.meta.changes > 0)) {
								console.error("Update failed.");//生徒数の変更失敗処理
								return new Response(JSON.stringify([{ "message": "Update failed.", "status_Code": "JE-05", "result": "error" }]), await headerMaker(500, false));
							}
						}
					} catch (error) {
						console.error("Database error:", error);//生徒数の変更失敗処理
						return new Response(JSON.stringify([{ "message": "Error changing students value of table:Classes", "status_Code": "JE-04", "result": "error" }]), await headerMaker(500, false));
					}

					//クラステーブルへの参加
					var currentTime = String(Math.floor(new Date().getTime() / 1000)); // 現在のUNIXTIMEを取得
					const answeredQuestions = 0;
					try {//参加済みユーザーに追加
						await env.D1_DATABASE.prepare("INSERT INTO ConnectedUsers VALUES ('" + class_Code + "','" + userName + "','" + currentTime + "','" + answeredQuestions + "','" + userEmail + "')"
						).run();

						console.log("User added successfully to ConnectedUsers table.");
						specifiedClassInfo.push({ "message": "joined class successfully.", "status_Code": "J-1", "result": "success" })
						return new Response(JSON.stringify(specifiedClassInfo), await headerMaker(200, false));
					}
					catch (error) {
						if (String(error).includes("constraint")) {
							;//すでにクラスに参加済みのとき
							try {
								const { results: connectedUsersResults } = await env.D1_DATABASE.prepare(//すでに接続しているクラスのクラスコードを取得
									"SELECT * FROM ConnectedUsers WHERE connected_User_Name = ?"
								)
									.bind(userName)
									.all();


								var connected_class_Code = connectedUsersResults[0].class_Code;


								if (connected_class_Code == class_Code) {//指定されたクラスにすでに参加しているとき
									currentTime = String(Math.floor(new Date().getTime() / 1000));
									await env.D1_DATABASE.prepare(//接続済みユーザーのデータを変更
										"UPDATE ConnectedUsers SET connected_Time = ? WHERE connected_User_Name = ? AND connected_User_Email = ?"
									).bind(currentTime, userName, userEmail).run();

									specifiedClassInfo.push({ "message": "You are already connected to specified class. Reconnected class.", "status_Code": "J-2", "result": "success" })
									return new Response(JSON.stringify(specifiedClassInfo), await headerMaker(200, false));
								}
								currentTime = String(Math.floor(new Date().getTime() / 1000));


								await env.D1_DATABASE.prepare(//接続済みクラスの接続数を1減らす=切断処理
									"UPDATE Classes SET students = ? WHERE class_Code = ?"
								)
									.bind(String(Number(specifiedClassInfo[0].students) - 1), connected_class_Code)
									.run();

								var Maximum_Student_Count;
								if (IsInvalid(class_Settings.MaximumStudent)) {//v3.0以前のクラスの対応
									Maximum_Student_Count = 100;//デフォルト値である100にする
								}
								else {
									Maximum_Student_Count = class_Settings.MaximumStudent//設定されていたらそれにする
								}

								if (specifiedClassInfo[0].students != Maximum_Student_Count) {//最大数チェック
									await env.D1_DATABASE.prepare(//新クラスへ再参加
										"UPDATE Classes SET students = " + String(Number(specifiedClassInfo[0].students) + 1) + " WHERE class_Code = " + class_Code
									).run();

									await env.D1_DATABASE.prepare(//接続済みユーザーのデータを変更
										"UPDATE ConnectedUsers SET connected_Time = ? , class_Code = ? WHERE connected_User_Name = ? AND connected_User_Email = ?"
									).bind(currentTime, class_Code, userName, userEmail)
										.run();

									//履歴追加処理。v3.5でリリース。まだ準備段階なのでコメントアウトしています。
									//History modifying codes. COMMENTED OUT BECAUSE NOT REREASED VERSION.
									/*
									await env.D1_DATABASE.prepare(
			  	
									).bind();
									*/
									//履歴追加処理終了。

									console.log("User updated connected class.");//接続成功
									//接続成功情報を追加
									specifiedClassInfo.push({ "message": "You are already connected to another class. Updated connected class.", "status_Code": "J-3", "result": "success" })
									//接続成功情報を追加
									return new Response(JSON.stringify(specifiedClassInfo), await headerMaker(200, false));
								}
								else {//接続生徒数が最大値を超えたとき
									console.log("exceeded student maximum count.")
									return new Response(JSON.stringify([{ "message": "Exceeded Maximum Student Count. You cannnot connect this class.", "status_Code": "JE-06", "result": "error" }]), await headerMaker(403, false));
								}
							}
							catch (error) {//Dbのエラー。これ以上は書ききれん。
								console.log("Database error occured.", error)
								return new Response(JSON.stringify([{ "message": "Error updating connected class info. Please contact to support. : " + error, "status_Code": "JE-02", "result": "error" }]), await headerMaker(500, false));
							}
						}
						else {//Dbのエラー。これ以上は書ききれん。
							console.error("Error adding user to ConnectedUsers table:", error);
							return new Response(JSON.stringify([{ "message": "Failed to connect class. Plase contact to support.", "status_Code": "JE-03", "result": "error" }]), await headerMaker(500, false));
						}
					}
					//クラステーブルへの追加処理終了
				}
				else {//クラスがアクティブでないとき
					specifiedClassInfo.push({ "message": "Found class, but class is not active. check class code.", "status_Code": "JE-12", "result": "error" })
					return new Response(JSON.stringify(specifiedClassInfo), await headerMaker(404, false));
				}
			}
			else {//指定したクラスが存在しない
				console.error("Specified class did not found.");
				return new Response(JSON.stringify([{ "message": "Specified class did not found.", "status_Code": "JE-01", "result": "error" }]), await headerMaker(404, false));
			}
		}
		catch (error) {
			console.error("DataBase error." + error)
			return new Response(JSON.stringify([{ "message": "DataBase error. Please contact to support:support@cla-q.net", "status_Code": "JE-05", "result": "error" }]), await headerMaker(500, false));
		}
	}
	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/student/leave") {//生徒がクラスから抜ける(statuscode L or LE)
		//データ吸出し
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			if (IsInvalid(userName) && IsInvalid(userEmail)) {
				console.error("required value is not specified.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}


		const { results: connectedUsersResults } = await env.D1_DATABASE.prepare(//すでに接続しているクラスのクラスコードを取得
			"SELECT * FROM ConnectedUsers WHERE connected_User_Name = ? AND connected_User_Email = ?"
		)
			.bind(userName, userEmail)
			.all();

		if (connectedUsersResults.length == 0) {//接続しているクラスがないとき
			console.error("You are not joined to any classes.");//生徒数の変更失敗処理
			return new Response(JSON.stringify([{ "message": "You are not joined to any classes.", "status_Code": "LE-11", "result": "error" }]), await headerMaker(400, false));
		}
		else {//接続しているクラスが1つだけあるとき(2つ以上はDBがはじくのでありえない)
			var connected_class_Code = connectedUsersResults[0].class_Code;

			const { results: connectedClassInfo } = await env.D1_DATABASE.prepare(//接続済みのクラスを検索
				"SELECT * FROM Classes WHERE class_Code = ?"
			)
				.bind(connected_class_Code)
				.all();

			if (connectedClassInfo[0].students != 0) {
				await env.D1_DATABASE.prepare(//接続済みクラスの接続数を1減らす=切断処理
					"UPDATE Classes SET students = ? WHERE class_Code = ?"
				)
					.bind(Number(connectedClassInfo[0].students) - 1, connected_class_Code)
					.run();

				await env.D1_DATABASE.prepare(//接続済みリストから削除
					"DELETE FROM ConnectedUsers WHERE connected_User_Name = ? AND connected_User_Email = ?"
				)
					.bind(userName, userEmail)
					.run();

				console.log("Succesfully leaved class.");//切断成功処理
				return new Response(JSON.stringify([{ "message": "You succesfully leaved class:" + connected_class_Code, "status_Code": "L-01", "result": "success" }]), await headerMaker(200, false));
			}
		}
	}
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/student/submit_answer") { //生徒:答えの送信
		try {
			const data = await request.json();
			var userName = data.userName;
			var userEmail = data.userEmail;
			var class_Code = data.class_Code;
			var answer_Value = data.answer_Value;
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			console.log(error)
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		const { results: specifiedClassInfo } = await env.D1_DATABASE.prepare(
			"SELECT * FROM Classes WHERE class_Code = ?"
		)
			.bind(class_Code)
			.all();
		console.log("Query results:", specifiedClassInfo);
		var currentTime = String(Math.floor(new Date().getTime() / 1000));
		var currentQuestionNumber = specifiedClassInfo[0].current_Question_Number;
		if (currentQuestionNumber == "0") {
			console.error("No questions are opened.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "No questions are opened.", "status_Code": "SSE-11", "result": "error" }]), await headerMaker(403, false));
		}
		try {
			if (userName == "Uptime") {
				try {
					await env.D1_DATABASE.prepare("INSERT INTO Answers VALUES ( ? , ? , ? , ? , ? , ?)"
					).bind(class_Code, String(currentQuestionNumber), answer_Value, userName, userEmail, currentTime)
						.run();
					return new Response(JSON.stringify([{ "message": "Successfully submitted the answer.", "status_Code": "SS-01", "result": "success" }]), await headerMaker(200, false));
				}
				catch {
					return new Response(JSON.stringify([{ "message": "DataBase error.", "status_Code": "SSE-01", "result": "error" }]), await headerMaker(500, false));
				}
			}
			else {
				const { results: answerExistCheck } = await env.D1_DATABASE.prepare(
					"SELECT * FROM Answers WHERE class_Code = ? AND question_Number = ? AND submitted_User_Email = ?"
				)
					.bind(class_Code, String(currentQuestionNumber), userEmail)
					.all();
				console.log(class_Code, answerExistCheck);
				console.log(answerExistCheck);
				if (answerExistCheck.length != 0) {
					console.error("User already submitted answer.");//D
					return new Response(JSON.stringify([{ "message": "You already submitted the answer.", "status_Code": "SSE-12", "result": "error" }]), await headerMaker(400, false));
				}
				await env.D1_DATABASE.prepare("INSERT INTO Answers VALUES ( ? , ? , ? , ? , ? , ?)"
				).bind(class_Code, String(currentQuestionNumber), answer_Value, userName, userEmail, currentTime)
					.run();
				console.log("Successfully submitted the answer.");//必要なデータが与えられていない
				return new Response(JSON.stringify([{ "message": "Successfully submitted the answer.", "status_Code": "SS-01", "result": "success" }]), await headerMaker(200, false));
			}
		}
		catch (error) {
			console.error("DataBase error.", error);//DBエラー
			return new Response(JSON.stringify([{ "message": "DataBase error.", "status_Code": "SSE-01", "result": "error" }]), await headerMaker(500, false));
		}
	}
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/student/Class_Setitngs") {
		const data = await request.json();
		var class_Code = data.class_Code;
		if (IsInvalid(class_Code)) {
			console.error("required value is not specified.",);//生徒数の変更失敗処理
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, false));
		}
		console.log(class_Code)
		//クラス参加処理スタート
		try {
			const { results: specifiedClassInfo } = await env.D1_DATABASE.prepare(
				"SELECT * FROM Classes WHERE class_Code = ?"
			)
				.bind(class_Code)
				.all();

			var class_Settings = JSON.parse("[" + specifiedClassInfo[0].Settings + "]");
			console.log("Query results:", specifiedClassInfo);
			console.log(class_Settings);

			class_Settings.push({ "message": "Successfully fetched class setting", "status_Code": "S-01", "result": "success" });
			return new Response(JSON.stringify(class_Settings), await headerMaker(200, false));
		}
		catch (error) {
			console.log(error);
			return new Response(JSON.stringify([{ "message": error, "status_Code": "SE-01", "result": "error" }]), await headerMaker(400, false));
		}
	}
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	else if (pathname === "/v2/student/teapot") {//ジョーク
		return new Response("How do you know this API pathname? 418 I'm a teapot.", {
			status: 418,
			headers: {
				"Content-Type": "text/plain",
				"Vary": "Origin",
				"Access-Control-Allow-Credentials": "true",
				"Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type"
			},
		});
	}
}



//////////////////////////////////////////////////////バリデーションチェックのためのfunction/////////////////////////////////
function IsInvalid(value) {
	if (value == void 0 || value == "" || value == null) {
		return true;
	} else {
		return false;
	}
}
//////////////////////////////////////////////////////バリデーションチェックのためのfunction/////////////////////////////////



////////////////////////////////////////////////////ヘッダーを作らせる//////////////////////////////////////////////////////
async function headerMaker(statuscode, cors) {
	if (cors == true) {
		return {
			status: statuscode,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "https://app.cla-q.net",
				"Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type"
			}
		};
	}
	else {
		return {
			status: statuscode,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type"
			}
		};
	}
}
////////////////////////////////////////////////////ヘッダーを作らせる//////////////////////////////////////////////////////



//////////////////////////////////////生徒かどうかを調べる///////////////////////////////
async function isStudentCheck(userEmail, userName) {
	var url = "https://api.cla-q.net/detect_role";
	var postData = {
		userEmail: userEmail,
		userName: userName,
	};
	await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Origin: "https://cla-q.net/",
		},
		body: JSON.stringify(postData),
	})
		.then((response) => response.json())
		.then((data) => {
			var isStudent;
			if (data.length != 0) {
				var responseresult = data[Object.keys(data).length - 1];
				console.log(responseresult.status_Code);
				if (responseresult.status_Code == "DR-01") {
					isStudent = false;
					console.log("user is not student.")
				} else if (responseresult.status_Code == "DR-02") {
					isStudent = true;
					console.log("user is student.")
				}
				if (isStudent != undefined) {
					return isStudent;
				}
				else {
					return "error";
				}
			}
			else {
				return "error";
			}
		})
		.catch((error) => {
			console.log(error)
		});
}
//////////////////////////////////////生徒かどうかを調べる///////////////////////////////


/////////////////////////////////////クラスコードを生成する////////////////////////////////
function generateClassCode() {
	var arr = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
	var K1 = arr[Math.floor(Math.random() * arr.length)];
	var K2 = arr[Math.floor(Math.random() * arr.length)];
	var K3 = arr[Math.floor(Math.random() * arr.length)];
	var K4 = arr[Math.floor(Math.random() * arr.length)];
	var K5 = arr[Math.floor(Math.random() * arr.length)];
	var K6 = arr[Math.floor(Math.random() * arr.length)];
	var NUM = K1 + K2 + K3 + K4 + K5 + K6;
	return NUM;
  }
  //////////////////////////////////クラスコードを生成する//////////////////////////////////