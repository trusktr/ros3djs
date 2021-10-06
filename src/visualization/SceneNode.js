import THREE from '../shims/three/core.js';
import ROSLIB from '../shims/roslib/ROSLIB.js';

/**
 * @author Jihoon Lee - jihoonlee.in@gmail.com
 * @author Russell Toris - rctoris@wpi.edu
 */

export class SceneNode extends THREE.Object3D {
  type = 'SceneNode';

  /**
   * A SceneNode can be used to keep track of a 3D object with respect to a ROS frame within a scene.
   *
   * @constructor
   * @param options - object with following keys:
   *
   *  * tfClient (optional) - a TFClient instance. If one is not provided, use setTfClient() to optionally provide one later, otherwise the SceneNode will not be connected to any network data.
   *  * frameID - the frame ID this object belongs to
   *  * pose (optional) - the pose associated with this object
   *  * object (optional) - the THREE 3D object to be wrapped. If not provided, you can add one later with the add() method.
   */
  constructor(options) {
    super();
    options = options || {};
    var that = this;
    this.frameID = options.frameID;
    var object = options.object;
    this.pose = options.pose || new ROSLIB.Pose();

    // Do not render this object until we receive a TF update, unless specified otherwise.
    this.visible = options.visible ?? false;

    // For convenience, add the model if provided via options.
    if (object) {
      this.add(object);
    }

    // set the inital pose
    this.updatePose(this.pose);

    // save the TF handler so we can remove it later
    this.tfUpdate = function(msg) {

      // apply the transform
      var tf = new ROSLIB.Transform(msg);
      var poseTransformed = new ROSLIB.Pose(that.pose);
      poseTransformed.applyTransform(tf);

      // update the world
      that.updatePose(poseTransformed);
      that.visible = true;
    };

    this.setTfClient(options.tfClient);
  };

  /**
   * Set the tfClient. Unsubscribes from the previous one if any, then
   * subscribes to the new one. This can be useful for creating SceneNodes
   * without a network connection for static rendering. The setTfClient method
   * can be used to give the SceneNode a TFClient later, which can be useful
   * for "hydrating" a scene that was loaded via JSON for example.
   *
   * @param tfClient - The new tfClient.
   */
  setTfClient(tfClient) {
    if (!tfClient) {
      return;
    }

    if (this.tfClient) {
      this.unsubscribeTf();
    }

    this.tfClient = tfClient;

    // listen for TF updates
    this.tfClient.subscribe(this.frameID, this.tfUpdate);
  };

  /**
   * Set the pose of the associated model.
   *
   * @param pose - the pose to update with
   */
  updatePose(pose) {
    this.position.set( pose.position.x, pose.position.y, pose.position.z );
    this.quaternion.set(pose.orientation.x, pose.orientation.y,
        pose.orientation.z, pose.orientation.w);
    this.updateMatrixWorld(true);
  };

  unsubscribeTf() {
    this.tfClient.unsubscribe(this.frameID, this.tfUpdate);
  };

  toJSON(meta) {
    const output = super.toJSON(meta);
    const {object} = output;

    // We only care about these properties for serialization and subsequently
    // loading a static scene. tcClient is not needed as the scene will be
    // static.
    object.frameID = this.frameID;
    object.pose = {
      position: {
        x: this.pose.position.x,
        y: this.pose.position.y,
        z: this.pose.position.z,
      },
      orientation: {
        x: this.pose.orientation.x,
        y: this.pose.orientation.y,
        z: this.pose.orientation.z,
        w: this.pose.orientation.w,
      },
    };

    return output;
  }
}
