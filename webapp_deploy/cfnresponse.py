import urllib3
import json

http = urllib3.PoolManager()
SUCCESS = "SUCCESS"
FAILED = "FAILED"


def send(
    event,
    context,
    responseStatus,
    responseData=None,
    physicalResourceId=None,
    noEcho=False,
):
    responseUrl = event["ResponseURL"]

    print(responseUrl)

    responseBody = {}
    responseBody["Status"] = responseStatus
    responseBody["PhysicalResourceId"] = physicalResourceId or context.log_stream_name
    responseBody["StackId"] = event["StackId"]
    responseBody["RequestId"] = event["RequestId"]
    responseBody["LogicalResourceId"] = event["LogicalResourceId"]
    responseBody["NoEcho"] = noEcho
    responseBody["Data"] = responseData

    json_responseBody = json.dumps(responseBody)

    print("Response body:\n" + json_responseBody)

    headers = {"content-type": "", "content-length": str(len(json_responseBody))}

    try:

        response = http.request(
            "PUT", responseUrl, body=json_responseBody.encode("utf-8"), headers=headers
        )
        print("Status code: " + response.reason)
    except Exception as e:
        print("send(..) failed executing requests.put(..): " + str(e))
