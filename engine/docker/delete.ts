import DockerClient from "dockerode";
import {currentContext} from "../../app";
import {ServiceEngine} from "../engine";

export default function (self: ServiceEngine, client: DockerClient): ServiceEngine['delete'] {
    return async (id) => {
        try {
            if (self) {
                // del func is called on startup,
                // this prevents it from accessing undefined 'self' stop.
                await self.stop(id);
            }
            const c = client.getContainer(id);
            const {Image} = await c.inspect();
            await c.remove({ force: true });
            await client.getImage(Image).remove({ force: true });
            return true;
        } catch (e) {
            if (e.message.includes('No such container:')) {
                currentContext?.logger.warn('Container not found, ignoring...');
                return true;
            }
            console.log(e);
            return false;
        }
    }
}