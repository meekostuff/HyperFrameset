<!DOCTYPE html>
<script src="../boot.js"></script>

<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>post.php</title>
<link rel="frameset" type="text/html" href="decor/frameset.html" />
<link rel="stylesheet" href="noframeset.css" />
<style>
*[id] { margin: 0.5em; border: 1px dashed black; }
.remove { background-color: red; color: white; }
</style>
<style type="text/css">
.inline.noframeset { background-color: red; color: yellow; }
</style>
</head>
<body>
<div class="remove">
before #page-banner: This is irrelevant content and MUST NOT appear.
</div>
<div id="page-header">
#page-header
<h1>&lt;form method=&quot;post&quot;&gt; response-page</h1>
</div>
<div class="remove">
before #page-main: This is irrelevant content and MUST NOT appear.
</div>
<div id="page-main">
#page-main
<div class="normal">
	<p>Data received: </p>
	<blockquote><?= $_POST['q'] ?></blockquote>
</div>
</div>
<div class="remove">
after #main: This is irrelevant content and MUST NOT appear.
</div>
<div id="page-footer">
#page-footer
</div>
</body>
</html>

