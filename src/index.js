export default {
	async fetch(request, env, ctx) {
		const { pathname } = new URL(request.url);
		if (request.method == "OPTIONS") {
			return new Response(null, {
				status: 200,
				headers: no_CORS_headers
			});
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
			if (checkValidate(class_Code)) {
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
			if (checkValidate(userName) || checkValidate(userEmail)) {
				console.error("required value is not specified.");
				return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		} catch (error) {
			console.error("required value is not specified.");
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
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
			return new Response(JSON.stringify(result), await headerMaker(200, true));
		} catch (error) {
			console.log(error);
			return new Response(JSON.stringify([{ "message": "Internal server error." + error, "status_Code": "DRE-01", "result": "error" }]), await headerMaker(500, true));
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
				return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "InternalErrorMessage": String(error), "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
		}
		try {
			const { results: specifiedClassInfo } = await env.D1_DATABASE.prepare(//接続済みのクラスを検索
				"SELECT * FROM Classes WHERE class_Code = ? AND created_Teacher_Email = ?"
			).bind(class_Code, userEmail).all();
			console.log("Got class info successfully.")
			specifiedClassInfo.push({ "message": "Got class info successfully.", "status_Code": "CI-01", "result": "success" })
			return new Response(JSON.stringify(specifiedClassInfo), await headerMaker(200, true));
		}
		catch (error) {
			console.log("Failed to got class info.", error)
			return new Response(JSON.stringify([{ "message": "Failed to got class info. This is internal error. Contact support.", "InternalErrorMessage": String(error), "status_Code": "CIE-01", "result": "error" }]), await headerMaker(403, true));
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
				return new Response(JSON.stringify([{ "message": "Required value is not specified or wrong.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "InternalErrorMessage": String(error), "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, true));
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
				return new Response(JSON.stringify([{ "message": "Created class successfully.", "class_Code": generated_Class_Code, "status_Code": "CC-01", "result": "success" }]), await headerMaker(200, true));
			}
			catch (error) {
				console.log("Failed to create class.", error)
				return new Response(JSON.stringify([{ "message": "Failed to create class. Internal error. Contact support.", "InternalErrorMessage": String(error), "status_Code": "CCE-01", "result": "error" }]), await headerMaker(403, true));
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
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, true));
		}
		else {//先生アカウントだった時
			try {
				await env.D1_DATABASE.prepare(//クラスを削除
					"DELETE FROM Classes WHERE class_Code = ? AND created_Teacher_Name = ? AND created_Teacher_Email = ?"
				).bind(class_Code, userName, userEmail).run();
			}
			catch (error) {
				console.log("Failed to delete class. User may not be an owner of this class.", error)
				return new Response(JSON.stringify([{ "message": "Failed to delete specitfied class. Are you an owner of the class?", "status_Code": "CDE-11", "result": "error" }]), await headerMaker(403, true));
			}
			try {
				await env.D1_DATABASE.prepare(//接続済みリストからそのクラスにつながっている生徒を削除
					"DELETE FROM ConnectedUsers WHERE class_Code = ?"
				).bind(class_Code).run();
			}
			catch (error) {
				console.log("Failed to delete joined user info.", error)
				return new Response(JSON.stringify([{ "message": "Database error:failed to delete joined user info. Contact support.", "InternalErrorMessage": String(error), "status_Code": "CDE-01", "result": "error" }]), await headerMaker(500, true));
			}
			console.log("Class deleted successfully.")
			return new Response(JSON.stringify([{ "message": "Deleted class successfully.", "class_Code": class_Code, "status_Code": "CD-01", "result": "success" }]), await headerMaker(200, true));
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
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, true));
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
				return new Response(JSON.stringify([{ "message": "Specified class not found.", "status_Code": "ICE-12", "result": "error" }]), await headerMaker(404, true));
			}
			if (class_owner == userName && class_owner_Email == userEmail && class_active == "true") {
				await env.D1_DATABASE.prepare(
					"UPDATE Classes SET active = ? , students = ? WHERE class_Code = ? AND created_Teacher_Name = ? AND created_Teacher_Email = ?"
				).bind("false", "0", class_Code, userName, userEmail).run();//クラスを非アクティブ化
			}
			else {
				if (class_active == "false") {
					console.log("Failed to inactivate class.Class was already inactive.")
					return new Response(JSON.stringify([{ "message": "Class is already inactive.", "status_Code": "ICE-13", "result": "error" }]), await headerMaker(400, true));
				} else {
					console.log("Failed to inactivate class. User is not an owner of this class.")
					return new Response(JSON.stringify([{ "message": "You are not an owner of the class.", "status_Code": "ICE-11", "result": "error" }]), await headerMaker(403, true));
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
			return new Response(JSON.stringify([{ "message": "Database error:failed to delete joined user info. Contact support.", "InternalErrorMessage": String(error), "status_Code": "ICE-01", "result": "error" }]), await headerMaker(500, true));
		}
		console.log("Class inactivated successfully.")
		return new Response(JSON.stringify([{ "message": "Inactivated class successfully.", "class_Code": class_Code, "status_Code": "IC-01", "result": "success" }]), await headerMaker(200, true));
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
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, true));
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
				return new Response(JSON.stringify([{ "message": "Specified class not found.", "InternalErrorMessage": String(error), "status_Code": "ACE-12", "result": "error" }]), await headerMaker(403, true));
			}
			if (class_owner == userName && class_owner_Email == userEmail && class_active == "false") {
				await env.D1_DATABASE.prepare(//クラスを非アクティブ化
					"UPDATE Classes SET active = ? WHERE class_Code = ? AND created_Teacher_Name = ? AND created_Teacher_Email = ?"
				).bind("true", class_Code, userName, userEmail).run();
			}
			else {
				if (class_active == "true") {
					console.log("Failed to inactivate class. Class was already active.")
					return new Response(JSON.stringify([{ "message": "Class is already active.", "status_Code": "ACE-13", "result": "error" }]), await headerMaker(400, true));
				} else {
					console.log("Failed to inactivate class. User is not an owner of this class.")
					return new Response(JSON.stringify([{ "message": "You are not an owner of the class.", "status_Code": "ACE-11", "result": "error" }]), await headerMaker(403, true));
				}
			}
		}
		console.log("Class Activated successfully.")
		return new Response(JSON.stringify([{ "message": "Activated class successfully.", "class_Code": class_Code, "status_Code": "AC-01", "result": "success" }]), await headerMaker(200, true));
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
				return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, true));
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
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, true));
		}
		else {//先生アカウントの時
			try {
				const { results: studentList } = await env.D1_DATABASE.prepare(
					"SELECT * FROM ConnectedUsers WHERE class_Code = ?"
				).bind(class_Code).all();
				return new Response(JSON.stringify(studentList), await headerMaker(200, true));
			}
			catch (error) {
				console.log(error)
				return new Response(JSON.stringify([{ "message": "Internal server error.", "status_Code": "SLIE-01", "result": "error" }]), await headerMaker(500, true));
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
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
		}
		var isStudent = false;
		// @ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, true));
		}
		else {//先生アカウントの時
			try {
				const { results: answerList } = await env.D1_DATABASE.prepare(//生徒の答え一覧を取得
					"SELECT * FROM Answers WHERE class_Code = ? AND question_Number = ?"
				).bind(class_Code, question_Number).all();
				console.log("return answerList.", answerList)
				return new Response(JSON.stringify(answerList), await headerMaker(200, true));
			}
			catch (error) {
				console.log(error)
				return new Response(JSON.stringify([{ "message": "Internal server error.", "status_Code": "ALIE-01", "result": "error" }]), await headerMaker(500, true));
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
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
		}
		var isStudent = false;
		// @ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, true));
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
						}]), await headerMaker(403, true));
				}
			}
			catch (error) {
				console.error(error);
				console.error("Database error.");
				return new Response(JSON.stringify([{ "message": "Database error.", "status_Code": "ASE-01", "result": "error" }]), await headerMaker(500, true));
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
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, true));
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
					return new Response(JSON.stringify([{ "message": "Finished question of class : " + class_Code, "status_Code": "AF-01", "result": "success" }]), await headerMaker(200, true));
				} else {
					// 実行されたが、行が変更されなかった場合の処理
					console.log("UPDATEが実行されましたが、行は変更されませんでした");
					console.log("Cannnot finish question. Maybe classCode or questionNum is not true. ");
					return new Response(JSON.stringify([{ "message": "Cannnot finish question. Maybe classCode or questionNum is not true. ", "status_Code": "AFE-12", "result": "error" }]), await headerMaker(403, true));
				}
			}
			catch (error) {
				console.error("Database error.");
				return new Response(JSON.stringify([{ "message": "Database error.", "status_Code": "AFE-01", "result": "error" }]), await headerMaker(403, true));
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
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
		}
		try {
			const { results: answerList } = await env.D1_DATABASE.prepare(//生徒の答え一覧を取得
				"SELECT * FROM Answers WHERE class_Code = ?"
			).bind(class_Code).all();
			return new Response(JSON.stringify(answerList), await headerMaker(200, false));
		}
		catch (error) {
			console.log(error)
			return new Response(JSON.stringify([{ "message": "Internal server error.", "status_Code": "ALIE-01", "result": "error" }]), await headerMaker(500, true));
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
				return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, true));
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
					return new Response(JSON.stringify([{ "message": "Finished question of class : " + class_Code, "status_Code": "AF-01", "result": "success" }]), await headerMaker(200, true));
				} else {
					// 実行されたが、行が変更されなかった場合の処理
					console.log("UPDATEが実行されましたが、行は変更されませんでした");
					console.log("Cannnot finish question. Maybe classCode or questionNum is not true. ");
					return new Response(JSON.stringify([{ "message": "Cannnot finish question. Maybe classCode or questionNum is not true. ", "status_Code": "AFE-12", "result": "error" }]), await headerMaker(403, true));
				}
			}
			catch (error) {
				console.error("Database error.");
				return new Response(JSON.stringify([{ "message": "Database error.", "status_Code": "AFE-01", "result": "error" }]), await headerMaker(403, true));
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

					return new Response(JSON.stringify(responseData), await headerMaker(200, true));
				} catch (error) {
					console.log(error);
					return new Response(JSON.stringify([{ "message": "Error fetching value to GAS." + error, "status_Code": "SHE-01", "result": "error" }]), await headerMaker(500, true));
				}
			}
			else {
				console.log("必要な値がないか壊れています。", data)
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {
			console.log("必要な値がないか壊れています。" + error)
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
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
				return new Response(JSON.stringify([{ "message": "Required value is not specified.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
			else {
				var settingjson = data.settings;
				await env.D1_DATABASE.prepare(//Uptime用のテストクラスの生徒数を0に変更
					"UPDATE Classes SET Settings = ? WHERE class_Code = ?"
				)
					.bind(JSON.stringify(settingjson), class_Code)
					.run();
				return new Response(JSON.stringify([{ "message": "Successfully saved class settings.", "status_Code": "S-01", "result": "success" }]), await headerMaker(200, true));
			}
		}
		catch (error) {
			console.log("必要な値がないか壊れています。" + error)
			return new Response(JSON.stringify([{ "message": "Required value is not specified." + error, "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));

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
				return new Response(JSON.stringify([{ "message": "Required value is not specified or wrong.", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.", "InternalErrorMessage": String(error), "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
		}
		var isStudent = false;
		//@ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, true));
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
				return new Response(JSON.stringify([{ "message": "Reserved class successfully.", "class_Code": generated_Class_Code, "status_Code": "RC-01", "result": "success" }]), await headerMaker(200, true));
			}
			catch (error) {
				console.log("Failed to create class.", error)
				return new Response(JSON.stringify([{ "message": "Failed to reserve class. Internal error. Contact support.", "InternalErrorMessage": String(error), "status_Code": "RCE-01", "result": "error" }]), await headerMaker(403, true));
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
				return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
			}
		}
		catch (error) {//データが吸い出せなかったとき
			console.error("required value is not specified.");//必要なデータが与えられていない
			return new Response(JSON.stringify([{ "message": "Required value is not specified.:", "status_Code": "NE-11", "result": "error" }]), await headerMaker(400, true));
		}
		var isStudent = false;
		// @ts-ignore
		isStudent = await isStudentCheck(userEmail, userName);
		if (isStudent) {//生徒アカウントをはじく
			console.error("User is not teacher.");
			return new Response(JSON.stringify([{ "message": "You are not logged in with Teacher account.", "status_Code": "NE-13", "result": "error" }]), await headerMaker(403, true));
		}
		else {//先生アカウントの時
			try {
				const { results: answerList } = await env.D1_DATABASE.prepare(//生徒の答え一覧を取得
					"SELECT * FROM Classes WHERE active = ? AND created_Teacher_Email = ?"
				)
					.bind("reserved", userEmail)
					.all();
				console.log("return answerList.", answerList)
				return new Response(JSON.stringify(answerList), await headerMaker(200, true));
			}
			catch (error) {
				console.log(error)
				return new Response(JSON.stringify([{ "message": "Internal server error.", "InternalErrorMessage": String(error), "status_Code": "LRCE-01", "result": "error" }]), await headerMaker(500, true));
			}
		}
	}
	else {
		console.info("API pathname is not described or wrong.")
		return new Response(JSON.stringify([{ "message": "API pathname is not described or wrong.", "status_Code": "NE-12", "result": "error" }]), await headerMaker(404, true));
	}
}

//////////////////////////////////////////////////////先生用エンドポイント終了///////////////////////////////////////////////////






//////////////////////////////////////////////////////バリデーションチェックのためのfunction/////////////////////////////////
function checkValidate(value) {
	if (value == void 0 || value == "" || value == null) {
		return true;
	} else {
		return false;
	}
}
//////////////////////////////////////////////////////バリデーションチェックのためのfunction/////////////////////////////////



////////////////////////////////////////////////////ヘッダーを作らせる//////////////////////////////////////////////////////
async function headerMaker(statuscode, cors) {
	if (cors) {
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